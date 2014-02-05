Arbiter.Loaders.LayersLoader = (function(){
	var layersToLoad; // Number of layers
	var featuresLoadedFor; // Features loaded for how many layers
	var errorLoadingFeatures; // An array of feature types that couldn't be loaded
	
	var reset = function(){
		layersToLoad = 0;
		featuresLoadedFor = 0;
		errorLoadingFeatures = [];
	};
	
	var triggerDoneLoadingEvent = function(){
		var map = Arbiter.Map.getMap();
		
		map.events.triggerEvent(Arbiter.Loaders.
				LayersLoader.DONE_LOADING_LAYERS);
	};
	
	var isDone = function(onSuccess){
		
		if(featuresLoadedFor === layersToLoad){
			onSuccess();
			triggerDoneLoadingEvent();
		}
		
		if(errorLoadingFeatures.length > 0){
			console.log("DISPLAY ERROR LOADING FEATURES", errorLoadingFeatures);
			Arbiter.Cordova.errorLoadingFeatures(errorLoadingFeatures);
		}
	};
	
	var clearMap = function() {
		Arbiter.Layers.removeAllLayers();
	};
	
	var setBaseLayer = function(){
		var map = Arbiter.Map.getMap();
		if (map.layers.length) {
			Arbiter.Layers.setNewBaseLayer(map.layers[0]);
		}
	};
	
	var loadWFSLayer = function(key, schema, _onSuccess){
		var olLayer = Arbiter.Layers.WFSLayer.create(key, schema);
		
		olLayer.metadata["onSaveStart"] = function(event) {
			var added = 0;
			var modified = 0;
			var removed = 0;
			for (var i = 0; i < event.features.length; i++){
				var feature = event.features[i];
				if (feature.metadata !== undefined && feature.metadata !== null) {
					if (feature.metadata.modified_state === Arbiter.FeatureTableHelper.MODIFIED_STATES.MODIFIED){
						modified++;
					} else if (feature.metadata.modified_state === Arbiter.FeatureTableHelper.MODIFIED_STATES.DELETED) {
						removed++;
					} else if (feature.metadata.modified_state === Arbiter.FeatureTableHelper.MODIFIED_STATES.INSERTED) {
						added++;
					}
				}
			}
			var getFeatureString = function(count) {
				if(count === 1){
					return Arbiter.Localization.localize('feature');
				}
				return Arbiter.Localization.localize('features');
			}
			var commitMsg = '';
			if (added > 0){
				commitMsg += Arbiter.Localization.localize('added') + ' ' + added + ' ' +
					getFeatureString(added);
			}
			if (modified > 0){
				if (added > 0){
					commitMsg += ', ';
				}
				commitMsg += Arbiter.Localization.localize('modified') + ' ' + modified + ' ' +
					getFeatureString(modified);
			}
			if (removed > 0){
				if (added > 0 || modified > 0){
					commitMsg += ', ';
				}
				commitMsg += Arbiter.Localization.localize('removed') + ' ' + removed + ' ' +
					getFeatureString(removed);
			}
			commitMsg += ' ' + Arbiter.Localization.localize('viaArbiter') + '.';
			console.log(commitMsg);
			event.object.layer.protocol.options.handle = commitMsg;
		};
		
		Arbiter.Layers.addLayer(olLayer);
		
		olLayer.setVisibility(schema.isVisible());
		
		var onSuccess = function(){
			featuresLoadedFor++;
			isDone(_onSuccess);
		};
		
		var onFailure = function(){
			errorLoadingFeatures.push(schema.getFeatureType());
			onSuccess();
		};
		
		Arbiter.Loaders.FeaturesLoader.loadFeatures(schema, 
				olLayer, onSuccess, onFailure);
	};
	
	var loadWMSLayer = function(key, schema){
		var olLayer = Arbiter.Layers.WMSLayer.create(key, schema);
		
		Arbiter.Layers.addLayer(olLayer);
		
		olLayer.setVisibility(schema.isVisible());
	};
	
	var addAOIToMap = function(_aoi){
		
		var context = this;
		
		var map = Arbiter.Map.getMap();
		
		var aoi = _aoi.split(',');
		
		var bounds = new OpenLayers.Bounds(aoi);
		
		var feature = new OpenLayers.Feature.Vector(bounds.toGeometry(), {});
		
		var oldLayers = map.getLayersByName(Arbiter.AOI);
		
		var aoiStyleMap = new OpenLayers.StyleMap({
             'default': new OpenLayers.Style({
                         fill: false,
                         strokeColor: 'red',
                         strokeWidth: 5
                 }) 
		});
		 
		var layer = new OpenLayers.Layer.Vector(Arbiter.AOI, { 
			styleMap: aoiStyleMap 
		});
		
		layer.addFeatures([feature]);
		
		if(oldLayers.length > 0){
			map.removeLayer(oldLayers[0]);
		}
		
		map.addLayer(layer);
	};
	
	var loadAOILayer = function(){
		Arbiter.PreferencesHelper.get(Arbiter.AOI, Arbiter.Loaders.LayersLoader, function(aoi){
			
			if(aoi !== null && aoi !== undefined && aoi !== ""){
				addAOIToMap(aoi);
			}
		}, function(e){
			console.log("Arbiter.Loaders.LayersLoader - Error loading aoi layer", e);
		});
	};
	
	var loadLayers = function(onSuccess){
		
		reset();
		
		clearMap();
		
		var layerSchemas = Arbiter.getLayerSchemas();
		
		var layer;
		
		Arbiter.Layers.addDefaultLayer(true);
		
		if(layerSchemas === undefined 
				|| layerSchemas === null 
				|| (Arbiter.getLayerSchemasLength() === 0)){
			
			setBaseLayer();
			
			loadAOILayer();
			
			if(Arbiter.Util.funcExists(onSuccess)){
				isDone(onSuccess);
			}
			
			return;
		}
		
		var schema;
		var key;
		var editableLayers = 0;
		
		for(key in layerSchemas){
			schema = layerSchemas[key];
			
			// Load the wms layer
			loadWMSLayer(key, schema);
			
			layersToLoad++;
		}
		
		for(key in layerSchemas){
			schema = layerSchemas[key];
			
			if(schema.isEditable()){
				editableLayers++;
				// Load the vector layer
				loadWFSLayer(key, schema, onSuccess);
			}
		}
		
		setBaseLayer();
		
		loadAOILayer();
		
		if(editableLayers === 0 
				&& Arbiter.Util.funcExists(onSuccess)){
			onSuccess();
		}
	};
	
	/**
	 * redraw the wfsLayers
	 */
	var redrawWFSLayers = function(){
		var map = Arbiter.Map.getMap();
		
		var wfsLayers = map.getLayersByClass("OpenLayers.Layer.Vector");
		
		for(var i = 0; i < wfsLayers.length; i++){
			wfsLayers[i].redraw();
		}
	};
	
	return {
		DONE_LOADING_LAYERS: "arbiter_done_loading_layers",
		
		load: function(onSuccess, onFailure){
			var context = this;
			
			//Arbiter.Cordova.showLoadingLayersProgress();
			
			// Load the servers
			Arbiter.ServersHelper.loadServers(this, function(){
				
				// Load the layers from the database
				Arbiter.LayersHelper.loadLayers(this, function(layers){
					
					// Load the layer schemas with layer data loaded from the db
					Arbiter.FeatureTableHelper.loadLayerSchemas(layers, function(){
							
							// Load the layers onto the map
							loadLayers(function(){
								
								var controlPanelHelper = new Arbiter.ControlPanelHelper();
								controlPanelHelper.getActiveControl(function(activeControl){
									
									controlPanelHelper.getLayerId(function(layerId){
										
										if(activeControl == controlPanelHelper.CONTROLS.INSERT){
											Arbiter.Controls.ControlPanel.startInsertMode(layerId);
										}
										
										if(Arbiter.Util.funcExists(onSuccess)){
											onSuccess();
										}
										
										// Sometimes after loading,
										// the wfs layers do not get drawn
										// properly.  This ensures they
										// get drawn correctly.
										redrawWFSLayers();
									}, onFailure)
								}, onFailure);
								
							});
					}, onFailure);
				}, onFailure);
			}, onFailure);
		},
		
		addEventTypes: function(){
			var map = Arbiter.Map.getMap();
			
			map.events.addEventType(this.DONE_LOADING_LAYERS);
		}
	};
})();