package dz.lqidwa.pilot;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.graphics.Bitmap;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

/** Isolated UI fixtures only. No account is created and no production data is written. */
@SuppressWarnings("deprecation")
public final class NativeDesignTest extends Instrumentation {
 private MainActivity activity;
 private Instrumentation getInstrumentation(){return this;}
 private MainActivity getActivity(){return activity;}
 private void assertFalse(boolean condition){assertFalse("Unexpected true condition",condition);}
 private void assertFalse(String message,boolean condition){if(condition)throw new AssertionError(message);}
 private void assertNotNull(Object value){if(value==null)throw new AssertionError("Missing screenshot");}
 @Override public void onCreate(Bundle arguments){super.onCreate(arguments);start();}
 @Override public void onStart(){Bundle result=new Bundle();try{activity=(MainActivity)startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));testNativeScreens();result.putString("stream","PASS: native screens, sign-in Back, role navigation and screenshots\n");finish(-1,result);}catch(Throwable error){result.putString("stream","FAIL: "+android.util.Log.getStackTraceString(error));finish(1,result);}}
 private void set(String key,Object value)throws Exception{Field f=MainActivity.class.getDeclaredField(key);f.setAccessible(true);f.set(getActivity(),value);}
 private void call(String name)throws Exception{Method m=MainActivity.class.getDeclaredMethod(name);m.setAccessible(true);m.invoke(getActivity());}
 private void render(String lang,String screen,boolean signedIn)throws Exception{
  getInstrumentation().runOnMainSync(()->{try{
   set("resumed",false);set("language",lang);set("screen",screen);set("token",signedIn?"isolated-ui-fixture":"");
   set("data",signedIn?new JSONObject("{\"role\":\"patient\",\"profile\":{\"id\":\"native-design-fixture\",\"name\":\"UI review\"},\"pharmacies\":[],\"reservations\":[],\"requests\":[]}"):new JSONObject());
   getActivity().getSharedPreferences("lqadwa-experience:native-design-fixture",0).edit().putInt("refresh",0).putBoolean("lessMotion",true).apply();
   call("render");
  }catch(Exception e){throw new RuntimeException(e);}});getInstrumentation().waitForIdleSync();
 }
 private boolean hasText(View v,String text){if(v instanceof TextView&&((TextView)v).getText().toString().equals(text))return true;if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++)if(hasText(((ViewGroup)v).getChildAt(i),text))return true;return false;}
 private void capture(String name)throws Exception{Thread.sleep(500);Bitmap image=getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(image);File file=new File(getActivity().getExternalFilesDir(null),name+".png");try(FileOutputStream out=new FileOutputStream(file)){image.compress(Bitmap.CompressFormat.PNG,100,out);}image.recycle();}
 public void testNativeScreens()throws Exception{
  render("ar","search",false);capture("welcome-ar");
  getInstrumentation().runOnMainSync(()->{try{set("signingIn",true);call("render");}catch(Exception e){throw new RuntimeException(e);}});getInstrumentation().waitForIdleSync();capture("signin-ar");
  getInstrumentation().runOnMainSync(()->getActivity().getOnBackPressedDispatcher().onBackPressed());getInstrumentation().waitForIdleSync();
  Field signing=MainActivity.class.getDeclaredField("signingIn");signing.setAccessible(true);assertFalse(signing.getBoolean(getActivity()));
  render("ar","search",true);capture("search-ar");
  render("en","map",true);capture("map-en");
  render("fr","bookings",true);capture("bookings-fr");
  render("en","account",true);capture("account-en");
  assertFalse("Patient must not see admin navigation",hasText(getActivity().getWindow().getDecorView(),"Administration"));
  getInstrumentation().runOnMainSync(()->{try{set("token","");set("data",new JSONObject());}catch(Exception e){throw new RuntimeException(e);}});
 }
}
