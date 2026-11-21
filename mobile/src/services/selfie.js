import { launchCamera } from 'react-native-image-picker';

/* The live selfie Sales Pulse asks for before a contract is signed as Party
   One — the same identity check the client goes through.

   It is always a fresh photo from the camera, front-facing: the photo library
   is never offered. The picture is kept only in memory, as an image data URL,
   until it is sent with the approval; nothing is saved to the phone.

   The library has a native half. An app built before it was added does not
   have it, and taking a selfie there says so instead of crashing. */

const OPTIONS = {
  mediaType: 'photo',
  cameraType: 'front',
  includeBase64: true,
  saveToPhotos: false,
  // Plenty to recognise a face by, and small enough to send on a phone line
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.9,
};

const PROBLEMS = {
  camera_unavailable: 'This phone has no camera the app can use.',
  permission:
    'Camera access is required to take your selfie. Allow it in Settings and try again.',
};

/** Opens the camera. Resolves to
      { photo }      an image data URL, once a picture is taken
      { cancelled }  the camera was closed without one
      { error }      a sentence to show */
export async function takeSelfie() {
  let result;
  try {
    result = await launchCamera(OPTIONS);
  } catch (e) {
    return {
      error:
        'The camera could not be opened. Update the app to the latest version and try again.',
    };
  }
  if (!result || result.didCancel) return { cancelled: true };
  if (result.errorCode) {
    return {
      error:
        PROBLEMS[result.errorCode] ||
        result.errorMessage ||
        'The camera could not be opened.',
    };
  }
  const shot = result.assets && result.assets[0];
  if (!shot || !shot.base64) {
    return { error: 'That photo could not be read. Take the selfie again.' };
  }
  const type = /png$/i.test(shot.type || '') ? 'png' : 'jpeg';
  return { photo: `data:image/${type};base64,${shot.base64}` };
}
