package com.lmn.Arbiter_Android.BaseClasses;

public class Tileset {
	public static final String DEFAULT_TILESET_NAME = "UndefinedTileset";

	public static String buildTilesetKey(Tileset tileset){
		return Integer.valueOf(tileset.getName() + tileset.getSourceId()).toString();
	}

	//private int fingerprint;
	private String tilesetName;
	private long created_at_time;
	private String created_by;
	private double filesize;
	private String source_id;
	private String bounds;

	private boolean checked;	// deprecated
	private boolean isDownloading;
	private int downloadProgress;

	// Server stuff
	private String serverName;
	private String serverUrl;
	private int serverId;

	public Tileset(){
		this.tilesetName = null;
		this.created_at_time = -1;
		this.created_by = null;
		this.filesize = -1;
		this.source_id = null;
		this.bounds = null;

		this.checked = false;

		this.serverId = -1;
		this.serverName = null;
		this.serverUrl = null;

		this.isDownloading = false;
		this.downloadProgress = 0;
	}

	public Tileset(String name, long created_at, String created_by,
				   double filesize, String source_id, String bounds,
				   int isDownloading, int downloadProgress){
		this.tilesetName = name;
		this.created_at_time = created_at;
		this.created_by = created_by;
		this.filesize = filesize;
		this.source_id = source_id;
		this.bounds = bounds;

		if (isDownloading == 0)
			this.isDownloading = false;
		else
			this.isDownloading = true;

		this.downloadProgress = downloadProgress;

		// This will be setup later
		this.serverId = -1;
		this.serverName = null;
		this.serverUrl = null;
	}

	public Tileset(Tileset item)
	{
		this.tilesetName = item.getName();
		this.created_at_time = item.getCreatedTime();
		this.created_by = item.getCreatedBy();
		this.filesize = item.getFilesize();
		this.source_id = item.getSourceId();
		this.bounds = item.getBounds();
		this.isDownloading = item.getIsDownloading();
		this.downloadProgress = item.getDownloadProgress();

		this.serverId = item.getServerId();
		this.serverName = item.getServerName();
		this.serverUrl = item.getServerUrl();
	}

	public boolean isChecked() { return checked; }
	public void setChecked(boolean check) { this.checked = check; }

	public boolean getIsDownloading() { return isDownloading; }
	public void setIsDownloading(boolean d) { this.isDownloading = d; }

	public int getDownloadProgress() { return downloadProgress; }
	public void setDownloadProgress(int p) { this.downloadProgress = p; }
	
	public String getName(){
		return tilesetName;
	}
	
	public void setName(String name){
		this.tilesetName = name;
	}

	public long getCreatedTime(){
		return created_at_time;
	}

	public void setCreatedTime(long time){
		this.created_at_time = time;
	}

	public String getCreatedBy(){
		return created_by;
	}
	
	public void setCreatedBy(String createdby){
		this.created_by = createdby;
	}

	
	public double getFilesize(){
		return filesize;
	}

	public String getFilesizeAfterConversion(){
		// Will convert from bytes to bytes, KB, MB, or GB
		String result = "";

		if (filesize > 0.0) {
			if (filesize > 1073741824.0) {
				String num = String.format("%.2f", (filesize / 1073741824.0));
				result += num + "GB";
			} else if (filesize > 1048576.0) {
				String num = String.format("%.2f", (filesize / 1048576.0));
				result += num + "MB";
			} else if (filesize > 1024.0) {
				String num = String.format("%.2f", (filesize / 1024.0));
				result += num + "KB";
			} else {
				result += filesize + " bytes";
			}
		} else {
			if (filesize < -1073741824.0) {
				String num = String.format("%.2f", (filesize / 1073741824.0));
				result += num + "GB";
			} else if (filesize < -1048576.0) {
				String num = String.format("%.2f", (filesize / 1048576.0));
				result += num + "MB";
			} else if (filesize < -1024.0) {
				String num = String.format("%.2f", (filesize / 1024.0));
				result += num + "KB";
			} else {
				result += filesize + " bytes";
			}
		}

		return result;
	}

	public void setFilesize(double size){
		this.filesize = size;
	}
	
	public String getSourceId(){
		return source_id;
	}
	
	public void setSourceId(String id){
		this.source_id = id;
	}

	public String getBounds() {
		return bounds;
	}

	public void setBounds(String bounds){
		this.bounds = bounds;
	}

	public String getServerName() { return serverName; }
	public void setServerName(String name) { this.serverName = name; }

	public String getServerUrl() { return serverUrl; }
	public void setServerUrl(String url) { this.serverUrl = url; }

	public int getServerId() { return serverId; }
	public void setServerId(int id) { this.serverId = id; }
	
	@Override
	public String toString(){
		return "{" +
				"\ttilesetName: " + tilesetName + "\n" +
				"\tcreated_at_time: " + created_at_time + "\n" +
				"\tcreated_by: " + created_by + "\n" +
				"\tfilesize: " + filesize + "\n" +
				"\tsource_id: " + source_id + "\n" +
				"\tbounds: " + bounds + "\n" +
				"\tisDownloading: " + isDownloading + "\n" +
				"}";
	}
}
