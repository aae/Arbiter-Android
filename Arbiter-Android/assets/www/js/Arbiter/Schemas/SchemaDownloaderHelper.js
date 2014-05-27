(function(){
	
	Arbiter.SchemaDownloaderHelper = function(_layer, _wfsVersion, _onSuccess, _onFailure){
		this.wfsVersion = _wfsVersion;
		this.layer = _layer;
		this.onSuccess = _onSuccess;
		this.onFailure = _onFailure;
		
		console.log("schemaDownloaderHelper layer = ", this.layer);
		this.serverId = this.layer[Arbiter.LayersHelper.serverId()];
		
		this.layerId = this.layer[Arbiter.LayersHelper.layerId()];
		
		var server = Arbiter.Util.Servers.getServer(this.serverId);
		
		this.serverType = server.getType();
		
		this.url = server.getUrl();
		this.credentials = Arbiter.Util.getEncodedCredentials(
				server.getUsername(), 
				server.getPassword());
		
		this.featureType = this.layer[Arbiter.LayersHelper.featureType()];
		this.srid = this.layer[Arbiter.GeometryColumnsHelper.featureGeometrySRID()];
		
		this.describeFeatureTypeReader = new OpenLayers.Format.WFSDescribeFeatureType();
		
		this.isReadOnly = false;
		
		this.color = this.layer[Arbiter.LayersHelper.color()];
		
		this.failed = false;
		
		this.workspace = null;
		
		this.schema = null;
	};
	
	var prototype = Arbiter.SchemaDownloaderHelper.prototype;

	prototype.onDownloadSuccess = function(alreadyInProject){
		
		if(Arbiter.Util.funcExists(this.onSuccess)){
			this.onSuccess(alreadyInProject);
		}
	};

	prototype.onDownloadFailure = function(){
		
		if(Arbiter.Util.funcExists(this.onFailure)){
			this.onFailure(this.featureType);
		}
	};
	
	prototype.downloadSchema = function() {
		if(this.serverType === "TMS"){
			
			this.onDownloadSuccess(false);
			
			return;
		}
		
		this._checkReadOnly();
	};
	
	prototype._checkReadOnly = function() {
		var context = this;
		
		var gotRequestBack = false;
		
		var url = this.url.substring(0, this.url.length - 4);
		
		var request = new OpenLayers.Request.POST({
			url: url + "/wfs/WfsDispatcher",
			data: '<?xml version="1.0" encoding="UTF-8"?> ' +
            '<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" ' +
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
            'service="WFS" version="1.0.0" ' +
            'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/wfs.xsd"> ' +
            '<wfs:Update xmlns:feature="http://www.geonode.org/" typeName="' +
            context.featureType + '">' +
            '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
            '<ogc:FeatureId fid="garbage_id" />' +
            '</ogc:Filter></wfs:Update>' +
            '</wfs:Transaction>',
			headers: {
				Authorization: 'Basic ' + context.credentials
			},
			success: function(response){
				gotRequestBack = true;
				
				console.log("schemaDownloaderHelper: readOnly check - ", response);
				
				var xml = response.responseXML;
				
				if(xml && xml.childNodes){
					
					var node = null;
					var reportNode = null;
					var exceptionNode = null;
					
					for(var i = 0; i < xml.childNodes.length; i++){
						
						node = xml.childNodes[i];
						
						// The only node we care about
						if(node.nodeName === "ServiceExceptionReport"){
							
							if(node.childNodes){
								
								// Run through the exceptions
								for(var j = 0; j < node.childNodes.length; j++){
									
									reportNode = node.childNodes[j];
									
									if(reportNode.nodeName === "ServiceException"){
										
										if(reportNode.childNodes){
											
											for(var k = 0; k < reportNode.childNodes.length; k++){
												
												exceptionNode = reportNode.childNodes[k];
												
												if(exceptionNode.nodeValue.indexOf('read-only') >= 0){
													
													context.isReadOnly = true;
													
													break;
												}
											}
										}
									}
								}
							}
							
							break;
						}
					}
				}
				
				console.log("isReadOnly = " + context.isReadOnly);
				context._saveReadOnly();
			},
			failure: function(response){
				gotRequestBack = true;
				
				context.onDownloadFailure();
			}
		});
		
		// Couldn't find a way to set timeout for an openlayers
		// request, so I did this to abort the request after
		// 15 seconds of not getting a response
		window.setTimeout(function(){
			if(!gotRequestBack){
				request.abort();
				
				context.onDownloadFailure();
			}
		}, 30000);
	};

	prototype._saveReadOnly = function(){
		
		var context = this;
		
		var content = {};
		
		content[Arbiter.LayersHelper.readOnly()] = this.isReadOnly;
		
		Arbiter.LayersHelper.updateLayer(this.layer[Arbiter.LayersHelper.featureType()], content, this, function(){
			
			context._downloadSchema();
		}, this.onDownloadFailure);
	};
	
	prototype._downloadSchema = function(){
		var context = this;
		
		var gotRequestBack = false;
		
		var url = this.url.substring(0, this.url.length - 4);
		
		var options = {
			url: url + "/wfs?service=wfs&version=" + context.wfsVersion + "&request=DescribeFeatureType&typeName=" + context.featureType,
			success: function(response){
				gotRequestBack = true;
				
				var results = context.describeFeatureTypeReader.read(response.responseText);
				
				// If there are no feature types, return.
				if(!results.featureTypes || !results.featureTypes.length){
					
					context.onDownloadSuccess(false);
					
					return;
				}
				
				try{
					context.schema = new Arbiter.Util.LayerSchema(context.layerId, context.url,
							results.targetNamespace, context.featureType, context.srid,
							results.featureTypes[0].properties, context.serverId,
							context.serverType, context.color, context.isReadOnly);
				}catch(e){
					var msg = "Could not create schema - " + JSON.stringify(e);
					
					throw msg;
				}
				
				context.workspace = results.targetNamespace;
				
				context.checkNotInProject();
			},
			failure: function(response){
				gotRequestBack = true;
				
				context.onDownloadFailure();
			}
		};
		
		if(Arbiter.Util.existsAndNotNull(context.credentials)){
			options.headers = {
				Authorization: 'Basic ' + context.credentials
			};
		}
		
		var request = new OpenLayers.Request.GET(options);
		
		// Couldn't find a way to set timeout for an openlayers
		// request, so I did this to abort the request after
		// 15 seconds of not getting a response
		window.setTimeout(function(){
			if(!gotRequestBack){
				request.abort();
				
				context.onDownloadFailure();
			}
		}, 30000);
	};

	prototype.checkNotInProject = function(){
		
		var context = this;
		
		Arbiter.GeometryColumnsHelper.getGeometryColumn(this.layer, context, function(){
			
			// Is in project so don't add this layer.
			console.log("layer is in project, so delete the layer from the project");
			
			context.deleteLayer();
		}, function(){
			// Isn't in project so continue.
			
			console.log("layer isn't in project so continue");
			
			context.saveWorkspace();
		}, function(e){
			
			console.log("Error checking to see if layer is in project");
			
			context.onDownloadFailure(e);
		});
	};
	
	prototype.deleteLayer = function(){
		
		var context = this;
		
		Arbiter.LayersHelper.deleteLayer(this.layer[Arbiter.LayersHelper.layerId()], function(){
			
			console.log("deleted layer successfully");
			
			context.onDownloadSuccess(true);
		}, function(e){
			
			console.log("Couldn't delete layer", e);
			
			context.onDownloadFailure(e);
		});
	};
	
	prototype.saveWorkspace = function(){
		var context = this;
		
		var content = {};
		
		content[Arbiter.LayersHelper.workspace()] = this.workspace;
		
		console.log("udpating the workspace!");
		
		// Update the layers workspace in the Layers table.
		Arbiter.LayersHelper.updateLayer(context.featureType, content, this, function(){
			console.log("udpated the workspace of the layer");
			
			context.addToGeometryColumns();
		}, function(e){
			
			context.onDownloadFailure();
		});
	};

	prototype.addToGeometryColumns = function(){
		var context = this;
		
		// After updating the layer workspace, 
		// add the layer to the GeometryColumns table
		Arbiter.GeometryColumnsHelper.addToGeometryColumns(this.schema, function(){
			console.log("added the table to the geometrycolumns table!");
			
			context.createFeatureTable();
		}, function(e){
			context.onDownloadFailure();
		});
	};

	prototype.createFeatureTable = function(){
		var context = this;
		
		// After adding the layer to the GeometryColumns table
		// create the feature table for the layer
		Arbiter.FeatureTableHelper.createFeatureTable(this.schema, function(){
			
			context.onDownloadSuccess(false);
		}, function(e){
			
			context.onDownloadFailure();
		});
	};
})();