package dz.lqidwa.pilot;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
final class SecureSession {
 private final Context context;
 SecureSession(Context context) { this.context = context; }
 private SecretKey key() throws Exception {
  KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
  if (!store.containsAlias("lqadwa.session")) { KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore"); generator.init(new KeyGenParameterSpec.Builder("lqadwa.session",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build()); generator.generateKey(); }
  return (SecretKey)store.getKey("lqadwa.session",null);
 }
 void save(String value) throws Exception { Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());String encrypted=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);context.getSharedPreferences("secure",0).edit().putString("session",encrypted).apply(); }
 String read() {try {String raw=context.getSharedPreferences("secure",0).getString("session","");if(raw.isEmpty())return "";String[] parts=raw.split(":");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],0)));return new String(cipher.doFinal(Base64.decode(parts[1],0)),java.nio.charset.StandardCharsets.UTF_8);} catch(Exception e){clear();return "";} }
 void clear(){context.getSharedPreferences("secure",0).edit().clear().apply();}
 // Only a payload hash and idempotency UUID are retained, encrypted and scoped
 // to the account. No medicine text, image, transcription or GPS is persisted.
 String requestToken(String owner,String payloadHash)throws Exception{
  if(owner.isEmpty()||owner.length()>100||!payloadHash.matches("[a-f0-9]{64}"))throw new IllegalArgumentException("Invalid request identity");
  String slot="request:"+owner,raw=context.getSharedPreferences("secure",0).getString(slot,"");
  if(!raw.isEmpty())try{
   String[] parts=raw.split(":");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],0)));cipher.updateAAD(slot.getBytes(java.nio.charset.StandardCharsets.UTF_8));
   org.json.JSONObject saved=new org.json.JSONObject(new String(cipher.doFinal(Base64.decode(parts[1],0)),java.nio.charset.StandardCharsets.UTF_8));String token=saved.optString("token");
   if(saved.optString("hash").equals(payloadHash)&&token.matches("[a-f0-9-]{36}"))return token;
  }catch(Exception invalid){/* A damaged pending entry never clears the login session. */}
  String token=java.util.UUID.randomUUID().toString();org.json.JSONObject saved=new org.json.JSONObject();saved.put("hash",payloadHash);saved.put("token",token);
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD(slot.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  String encrypted=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(saved.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);
  if(!context.getSharedPreferences("secure",0).edit().putString(slot,encrypted).commit())throw new java.io.IOException("Request identity could not be saved");
  return token;
 }
 void clearRequest(String owner){context.getSharedPreferences("secure",0).edit().remove("request:"+owner).commit();}
}
