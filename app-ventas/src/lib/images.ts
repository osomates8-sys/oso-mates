import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const BUCKET = 'product-images';

// Abre la galería y devuelve la foto elegida (recortada cuadrada), o null si se cancela.
export async function pickProductImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
}

// Sube la foto a <store_id>/<timestamp>.<ext> y devuelve la URL pública.
export async function uploadProductImage(storeId: string, image: { uri: string; mimeType: string }) {
  const ext = image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${storeId}/${Date.now()}.${ext}`;
  const body = await (await fetch(image.uri)).arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: image.mimeType });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Borra una foto anterior del bucket (si la URL es nuestra). Los errores se ignoran.
export async function deleteProductImage(publicUrl: string | null) {
  const marker = `/${BUCKET}/`;
  if (!publicUrl?.includes(marker)) return;
  await supabase.storage.from(BUCKET).remove([publicUrl.split(marker)[1]]);
}
