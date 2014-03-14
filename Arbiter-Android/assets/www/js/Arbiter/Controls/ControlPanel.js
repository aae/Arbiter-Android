Arbiter.Controls.ControlPanel = (function(){
	var selectedFeature = null;
	
	var selectControl = null;
	
	var modifyControl = null;
	
	var insertControl = null;
	
	var controlPanelHelper = new Arbiter.ControlPanelHelper();
	
	var mode = Arbiter.ControlPanelHelper.prototype.CONTROLS.SELECT;
	
	var cancel = false;
	
	var oomCleared = true;
	
	var _endInsertMode = function(){
		
		if(insertControl !== null && insertControl !== undefined){
			insertControl.deactivate();
			
			insertControl = null;
		}
	};
	
	var _startInsertMode = function(layerId, _geometryType){
		
		var olLayer = Arbiter.Layers.getLayerById(
				layerId, Arbiter.Layers.type.WFS);
		
		var geometryType = Arbiter.Geometry.getGeometryType(layerId, _geometryType);
		
		var context = Arbiter.Controls.ControlPanel;
		
		var schema = Arbiter.getLayerSchemas()[layerId];
		
		if(schema === null || schema === undefined){
			throw "Arbiter.Controls.ControlPanel _startInsertMode - "
				"could not get schema for layer id '" + layerId + "'";
		}
		
		controlPanelHelper.set(0, layerId, controlPanelHelper.CONTROLS.INSERT, 0, function(){
			
			var map = Arbiter.Map.getMap();
			
			insertControl = new Arbiter.Controls.Insert(olLayer, map,
					geometryType, function(feature){
				
				if(geometryType === Arbiter.Geometry.type.MULTIPOINT 
						|| geometryType === Arbiter.Geometry.type.MULTILINE
						|| geometryType === Arbiter.Geometry.type.MULTIPOLYGON){
					
					if(!Arbiter.Util.existsAndNotNull(feature.metadata)){
						feature.metadata = {};
					}
					
					feature.metadata[Arbiter.FeatureTableHelper.PART_OF_MULTI] = true; 
				}else{
					_endInsertMode();
				}
				
				mode = Arbiter.ControlPanelHelper.prototype.CONTROLS.INSERT;
				
				selectControl.select(feature);
				
				selectedFeature = feature;
				
				Arbiter.Cordova.getUpdatedGeometry();
			});
		}, function(e){
			console.log("start insert mode error", e.stack);
		});
	};
	
	var startModifyMode = function(feature){
		
		var featureId = null;
		
		if(feature.metadata !== null && feature.metadata !== undefined){
			featureId = feature.metadata[Arbiter.FeatureTableHelper.ID];
		}
		
		var layerId = Arbiter.Util.getLayerId(feature.layer);
		
		var wktGeometry = Arbiter.Geometry.getNativeWKT(feature, layerId);
		
		var schema = Arbiter.getLayerSchemas()[layerId];
		
		modifyControl = new Arbiter.Controls.Modify(Arbiter.Map.getMap(),
				feature.layer, feature, schema, function(feature){
		
			var wktGeometry = Arbiter.Geometry.getNativeWKT(feature, layerId);
			
			controlPanelHelper.set(featureId, layerId, 
					controlPanelHelper.CONTROLS.MODIFY, 
					wktGeometry, function(){
				
				console.log("successfully updated geometry");
			}, function(e){
				console.log("error updating modified geometry", e);
			});
		});
		
		controlPanelHelper.set(featureId, layerId,
				controlPanelHelper.CONTROLS.MODIFY, wktGeometry, function(){
			
			selectControl.deactivate();
			
			modifyControl.activate();
			
			mode = Arbiter.ControlPanelHelper.prototype.CONTROLS.MODIFY;
			
		}, function(e){
			console.log("start modify mode error", e);
		});
	};
	
	var removeFeature = function(feature){
		var layer = feature.layer;
		
		layer.removeFeatures([feature]);
	};
	
	var onSelect = function(feature){
		console.log("feature selected and selectedFeature = ", selectedFeature, feature);
		
		console.log("controlPanel onSelect modifyControl is", modifyControl);
		
		selectedFeature = feature;
		
		if(Arbiter.Util.existsAndNotNull(feature.layer) 
				// Account for the layers created by the draw feature control/handler
				&& (feature.layer.name.indexOf("OpenLayers") === -1)
				&& Arbiter.Util.existsAndNotNull(feature.metadata) 
				&& Arbiter.Util.existsAndNotNull(feature.metadata[Arbiter.FeatureTableHelper.ID])){
			
			var _mode = mode;
			var _cancel = cancel;
			
			// Make sure the mode related variables are reset
			mode = Arbiter.ControlPanelHelper.prototype.CONTROLS.SELECT;
			cancel = false;
			
			var featureId = null;
			
			if(feature.metadata !== null && feature.metadata !== undefined){
				featureId = feature.metadata[Arbiter.FeatureTableHelper.ID];
			}
			
			var layerId = Arbiter.Util.getLayerId(feature.layer);
			
			controlPanelHelper.set(featureId, layerId, controlPanelHelper.CONTROLS.SELECT, 0, function(){
				
				oomCleared = false;
				
				if(selectedFeature.metadata["modified"]){
					delete selectedFeature.metadata["modified"];
				}else{
					Arbiter.Cordova.featureSelected(
							feature.layer.protocol.featureType,
							featureId,
							layerId,
							feature,
							_mode,
							_cancel
					);
				}
			}, function(e){
				console.log("Error saving select mode", e);
			});
		}
	};
	
	var onUnselect = function(feature){
		
		console.log("feature unselected: ", feature);
		// Unselect all features (added for multigeometries)
		selectControl.unselect();
		
		// If the modifyControl is null,
		// make sure selectedFeature is
		// cleared out.
		if(modifyControl === null){
			selectedFeature = null;
			
			if(!oomCleared){
				// Starting to clear out so flag
				// it for already cleared
				oomCleared = true;
				
				controlPanelHelper.clear(function(){
					console.log("control panel cleared successfully");
					Arbiter.Cordova.featureUnselected();
				}, function(e){
					console.log("Couldn't clear the control panel...", e);
					oomCleared = false;
				});
			}
		}
	};
	
	selectControl = new Arbiter.Controls.Select(onSelect, onUnselect);
	
	return {
		registerMapListeners: function(){
			selectControl.registerMapListeners();
		},
		
		enterModifyMode: function(feature){
			try{
				if(feature === null 
						|| feature === undefined){
					
					feature = selectedFeature;
				}
				
				if(feature === null || feature === undefined){
					throw "ControlPanel.js feature should not be " + feature;
				}
				
				startModifyMode(feature);
			}catch(e){
				console.log("enterModifyMode error", e);
			}
		},
		
		exitModifyMode: function(onExitModify){
			
			if(!Arbiter.Util.existsAndNotNull(modifyControl)){
				
				if(Arbiter.Util.existsAndNotNull(onExitModify)){
					onExitModify();
				}
				
				return;
			}
			
			if(modifyControl.validEdit()){
				modifyControl.done(function(){
					
					modifyControl = null;
					
					selectControl.activate();
					
					if(Arbiter.Util.existsAndNotNull(selectedFeature)){
						
						if(!Arbiter.Util.existsAndNotNull(selectedFeature.metadata)){
							selectedFeature.metadata = {};
						}
						
						selectedFeature.metadata["modified"] = true;
						
						selectControl.select(selectedFeature);
					}
					
					try{
						if(Arbiter.Util.existsAndNotNull(onExitModify)){
							onExitModify();
						}
					}catch(e){
						console.log(e.stack);
					}
				});
			}else{
				Arbiter.Cordova.notifyUserToAddGeometry();
			}
		},
		
		unselect: function(){
			console.log("ControlPanel.unselect()");
			selectControl.unselect();
			
			if(modifyControl === null){
				selectedFeature = null;
				
				controlPanelHelper.clear();
			}
		},
		
		/**
		 * Restore the geometry to its original location,
		 * and exit modify mode.
		 */
		cancelEdit: function(wktGeometry){
			console.log("ControlPanel.cancelEdit wktGeometry = " + wktGeometry);
			
			modifyControl.cancel(wktGeometry, function(){
				//modifyControl.deactivate();
				
				modifyControl = null;
				
				// Reactivate the selectControl
				selectControl.activate();
				
				//console.log("selectControl active: " + selectControl.isActive());
				
				if(!Arbiter.Util.existsAndNotNull(selectedFeature.metadata)){
					selectedFeature.metadata = {};
				}
				
				selectedFeature.metadata["modified"] = true;
				
				// Reselect the selectedFeature
				selectControl.select(selectedFeature);
			});
		},
		
		getSelectedFeature: function(){
			return selectedFeature;
		},
		
		startInsertMode: function(layerId, geometryType){
			
			_startInsertMode(layerId, geometryType);
		},
		
		finishGeometry: function(){
			if(Arbiter.Util.existsAndNotNull(insertControl)){
				insertControl.finishGeometry();
			}
		},
		
		finishInserting: function(){
			insertControl.finishInserting();
		},
		
		getInsertControl: function(){
			return insertControl;
		},
		
		moveSelectedFeature: function(wktGeometry){
			
			if(wktGeometry === null || wktGeometry === undefined){
				throw "Arbiter.Controls.ControlPanel - couldn't restore original"
				+ " geometry because wktGeometry is " + wktGeometry;
			} 
			
			if(selectedFeature === null || selectedFeature === undefined){
				throw "Arbiter.Controls.Select - couldn't restore original"
				+ " geometry because selectedFeature is " + selectedFeature;
			}
			
			var geomFeature = Arbiter.Geometry.readWKT(wktGeometry);
			
			var srid = Arbiter.Map.getMap().projection.projCode;
			
			geomFeature.geometry.transform(new OpenLayers.Projection(schema.getSRID()),
					new OpenLayers.Projection(srid));
			
			olLayer.removeFeatures([selectedFeature]);
			
			selectedFeature.geometry = geomFeature.geometry;
			
			olLayer.addFeatures([selectedFeature]);
		},
		/**
		 * @param { OpenLayers.Feature.Vector } feature The feature to select.
		 */
		select: function(feature){
			selectControl.select(feature);
		},
		
		setSelectedFeature: function(feature){
			selectedFeature = feature;
		},
		
		setMode: function(_mode){
			mode = _mode;
		},
		
		getMode: function(){
			return mode;
		},
		
		getCancel: function(){
			return cancel;
		},
		
		addPart: function(){
			console.log("ControlPanel.addPart");
			
			modifyControl.beginAddPart();
		},
		
		removePart: function(){
			console.log("ControlPanel.removePart");
			
			modifyControl.removePart();
		},
		
		addGeometry: function(geometryType){
			console.log("ControlPanel.addGeometry: " + geometryType);
			
			modifyControl.beginAddGeometry(geometryType);
		},
		
		removeGeometry: function(){
			console.log("ControlPanel.removeGeometry");
			
			modifyControl.removeGeometry();
		},
		
		getModifyControl: function(){
			return modifyControl;
		}
	};
})();