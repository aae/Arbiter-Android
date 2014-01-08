package com.lmn.Arbiter_Android.Dialog.Dialogs.FeatureDialog;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;

import org.apache.cordova.CordovaInterface;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.text.InputType;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

import com.lmn.Arbiter_Android.ArbiterProject;
import com.lmn.Arbiter_Android.R;
import com.lmn.Arbiter_Android.BaseClasses.Feature;
import com.lmn.Arbiter_Android.DatabaseHelpers.FeatureDatabaseHelper;
import com.lmn.Arbiter_Android.DatabaseHelpers.TableHelpers.FeaturesHelper;
import com.lmn.Arbiter_Android.DatabaseHelpers.TableHelpers.GeometryColumnsHelper;
import com.lmn.Arbiter_Android.Media.MediaHelper;
import com.lmn.Arbiter_Android.ProjectStructure.ProjectStructure;

public class FeatureDialogBuilder {
	private Activity activity;
	private Context context;
	private CordovaInterface cordovaInterface;
	private AttributeHelper attributeHelper;
	private Feature feature;
	private LayoutInflater inflater;
	private LinearLayout outerLayout;
	private HashMap<String, MediaPanel> mediaPanels;
	private JSONObject enumeration;
	
	public FeatureDialogBuilder(Activity activity, View view,
			Feature feature, boolean startInEditMode){
		
		this.activity = activity;
		this.context = activity.getApplicationContext();
		
		try{
			this.cordovaInterface = (CordovaInterface) activity;
		} catch(ClassCastException e){
			e.printStackTrace();
		}
		
		this.feature = feature;
		this.attributeHelper = new AttributeHelper(feature);
		
		this.inflater = activity.getLayoutInflater();
		this.outerLayout = (LinearLayout) view.findViewById(R.id.outerLayout);
		
		this.mediaPanels = new HashMap<String, MediaPanel>();
	}
	
	private SQLiteDatabase getDb(){
		String projectName = ArbiterProject.getArbiterProject()
				.getOpenProject(activity);
		
		String path = ProjectStructure.getProjectPath(context, projectName);
		
		return FeatureDatabaseHelper.getHelper(context,
				path, false).getWritableDatabase();
	}
	
	public void build(final boolean startInEditMode){
		String title = activity.getResources().getString(R.string.loading);
		String message = activity.getResources().getString(R.string.loading_feature_info);
		
		final ProgressDialog getEnumerationProgress = 
				ProgressDialog.show(activity, title, message, true);
		
		cordovaInterface.getThreadPool().execute(new Runnable(){
			@Override
			public void run(){
				
				String _enumeration = GeometryColumnsHelper.getHelper()
						.getEnumeration(getDb(), feature.getFeatureType());
				
				try {
					
					enumeration = new JSONObject(_enumeration);
				} catch (JSONException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				
				activity.runOnUiThread(new Runnable(){
					@Override
					public void run(){
						appendAttributes(startInEditMode);
						
						getEnumerationProgress.dismiss();
					}
				});
			}
		});
	}
	
	private void appendGeometry(String key, String value, boolean startInEditMode){
		View attributeView = inflater.inflate(R.layout.feature_attribute, null);
		
		if(key != null){
			TextView attributeLabel = (TextView) attributeView.findViewById(R.id.attributeLabel);
			
			if(attributeLabel != null){
				attributeLabel.setText(key);
			}
		}
		
		EditText attributeValue = (EditText) attributeView.findViewById(R.id.attributeText);
		
		if(attributeValue != null){
			attributeValue.setText(value);
		}
		
		outerLayout.addView(attributeView);
		
		attributeHelper.add(key, attributeValue);
	}
	
	private void appendAttributes(boolean startInEditMode){
		String geometryName = feature.getGeometryName();
		
		String value = null;
		
		ContentValues attributes = feature.getAttributes();
		
		for(String key : attributes.keySet()){
			value = attributes.getAsString(key);
			
			if(!key.equals(FeaturesHelper.SYNC_STATE) 
					&& !key.equals(FeaturesHelper.MODIFIED_STATE) 
					&& !key.equals(FeaturesHelper.FID)){
				
				if(key.equals(MediaHelper.MEDIA) || key.equals(MediaHelper.FOTOS)){
					try {
						
						MediaPanel panel = new MediaPanel(activity, feature,
								this.outerLayout, this.inflater);
						
						panel.appendMedia(key, value, startInEditMode);
						
						mediaPanels.put(key, panel);
					} catch (JSONException e) {
						Log.e("FeatureDialogBuilder", "FeatureDialogBuilder.build() could not parse media json");
						e.printStackTrace();
					}
				}else if(key.equals(geometryName)){
					appendGeometry(key, value, startInEditMode);
				}else{
					appendAttribute(key, value, startInEditMode);
				}
			}
		}
	}
	
	private JSONObject getEnumeration(String key) throws JSONException{
		JSONObject _enumeration = null;
		
		if(enumeration != null && enumeration.has(key)){
			_enumeration = enumeration.getJSONObject(key);
		}
		
		return _enumeration;
	}
	
	private void setLabel(View layout, String key){
		if(key != null){
			TextView attributeLabel = (TextView) layout.findViewById(R.id.attributeLabel);
			
			if(attributeLabel != null){
				attributeLabel.setText(key);
			}
		}
	}
	
	private void setStartMode(EditText editText, boolean startInEditMode){
		editText.setFocusable(startInEditMode);
		editText.setFocusableInTouchMode(startInEditMode);
	}
	
	private void setStartMode(Spinner spinner, boolean startInEditMode){
		spinner.setEnabled(startInEditMode);
	}
	
	private Spinner appendDropDown(String key, ArrayAdapter<String> adapter, String value, boolean startInEditMode) throws JSONException{
		LinearLayout layout = (LinearLayout) inflater
				.inflate(R.layout.feature_dropdown, null);
		
		Spinner dropdown = (Spinner) layout.findViewById(R.id.spinner);
		
		dropdown.setAdapter(adapter);
	
		int position = adapter.getPosition(value);
		
		dropdown.setSelection(position);
		
		setStartMode(dropdown, startInEditMode);
		
		setLabel(layout, key);
		
		outerLayout.addView(layout);
		
		attributeHelper.add(key, dropdown);
		
		return dropdown;
	}
	
	private void appendEditText(String key, String value, boolean startInEditMode, EnumerationHelper helper){
		View attributeView = inflater.inflate(R.layout.feature_attribute, null);
		
		setLabel(attributeView, key);
		
		EditText attributeValue = (EditText) attributeView.findViewById(R.id.attributeText);
		
		if(attributeValue != null){
			String type = helper.getType();
			
			if(type.equals("xsd:dateTime")){
				Log.w("FeatureDialogBuilder", "FeatureDialogBuilder.appendEditText datetime found");
				attributeValue.setInputType(InputType.TYPE_CLASS_DATETIME);
				
				
				try {
					SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
					Date date = formatter.parse(value);
					attributeValue.setText(date.toString());
				} catch (ParseException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			}else{
				attributeValue.setText(value);
			}
			
			setStartMode(attributeValue, startInEditMode);
		}
		
		outerLayout.addView(attributeView);
		
		attributeHelper.add(key, attributeValue);
	}
	
	private void appendAttribute(String key, String value, boolean startInEditMode){
		JSONObject enumeration = null;
		
		try{
			enumeration = getEnumeration(key);
		}catch(JSONException e){
			e.printStackTrace();
		}
		
		//Log.w("FeatureDialogBuilder", "FeatureDialogBuilder.appendAttribute() key = " + key + " enumeration = " + enumeration);
		EnumerationHelper helper = new EnumerationHelper(activity, enumeration, inflater);
		
		if(helper.hasEnumeration()){
			try {
				ArrayAdapter<String> adapter = helper.getSpinnerAdapter();
				
				appendDropDown(key, adapter, value, startInEditMode);
			} catch (JSONException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}else{
			appendEditText(key, value, startInEditMode, helper);
		}
	}
	
	private void toggleMediaPanels(){
		MediaPanel panel = null;
		
		for(String key : mediaPanels.keySet()){
			panel = mediaPanels.get(key);
			
			panel.toggleEditMode();
		}
	}
	
	public boolean toggleEditMode(){
		boolean focusable = attributeHelper.toggleEditMode();
		
		Log.w("FeatureDialogBuilder", "FeatureDialogBuilder editMode = " + focusable);
		toggleMediaPanels();
		
		return focusable;
	}
	
	public void updateFeature(){
		attributeHelper.updateFeature();
	}
	
	public void updateFeaturesMedia(final String key, final String media, final String newMedia){
		activity.runOnUiThread(new Runnable(){
			@Override
			public void run(){
				
				ContentValues attributes = feature.getAttributes();
				
				attributes.put(key, media);
				
				MediaPanel panel = mediaPanels.get(key);
				
				try {
					Log.w("FeatureDialogBuilder", "FeatureDialogBuilder.updateFeaturesMedia loadMedia()");
					
					// Add new media to the arrayList of
					// media to be synced.  This won't
					// get saved until the feature is saved.
					panel.addMediaToSend(newMedia);
					
					panel.loadMedia();
				} catch (JSONException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			}
		});
	}
	
	public HashMap<String, MediaPanel> getMediaPanels(){
		return mediaPanels;
	}
}
