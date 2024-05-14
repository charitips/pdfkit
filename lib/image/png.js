import UPNG from '@pdf-lib/upng';
import { zlibSync } from 'fflate';

class PNGImage {
  constructor(data, label) {
    this.label = label;
    this.image = UPNG.decode(data);
    this.width = this.image.width;
    this.height = this.image.height;
    this.obj = null;
  }

  embed(document) {
    // let dataDecoded = false;

    this.document = document;
    if (this.obj) {
      return;
    }
    const frames = UPNG.toRGBA8(this.image);
    const frame = new Uint8Array(frames[0]);
    this.splitAlphaChannel(frame);
    // const isInterlaced = this.image.interlaceMethod === 1;

    this.obj = this.document.ref({
      Type: 'XObject',
      Subtype: 'Image',
      BitsPerComponent: 8,
      Width: this.width,
      Height: this.height,
      Filter: 'FlateDecode'
    });

    this.obj.data['ColorSpace'] = 'DeviceRGB';

    // if (!hasAlphaChannel) {
    //   const params = this.document.ref({
    //     Predictor: isInterlaced ? 1 : 15,
    //     Colors: this.image.colors,
    //     BitsPerComponent: this.image.bits,
    //     Columns: this.width
    //   });

    //   this.obj.data['DecodeParms'] = params;
    //   params.end();
    // }

    // if (this.image.palette.length === 0) {
    //   this.obj.data['ColorSpace'] = this.image.colorSpace;
    // } else {
    //   // embed the color palette in the PDF as an object stream
    //   const palette = this.document.ref();
    //   palette.end(Buffer.from(this.image.palette));

    //   // build the color space array for the image
    //   this.obj.data['ColorSpace'] = [
    //     'Indexed',
    //     'DeviceRGB',
    //     this.image.palette.length / 3 - 1,
    //     palette
    //   ];
    // }

    // // For PNG color types 0, 2 and 3, the transparency data is stored in
    // // a dedicated PNG chunk.
    // if (this.image.transparency.grayscale != null) {
    //   // Use Color Key Masking (spec section 4.8.5)
    //   // An array with N elements, where N is two times the number of color components.
    //   const val = this.image.transparency.grayscale;
    //   this.obj.data['Mask'] = [val, val];
    // } else if (this.image.transparency.rgb) {
    //   // Use Color Key Masking (spec section 4.8.5)
    //   // An array with N elements, where N is two times the number of color components.
    //   const { rgb } = this.image.transparency;
    //   const mask = [];
    //   for (let x of rgb) {
    //     mask.push(x, x);
    //   }

    //   this.obj.data['Mask'] = mask;
    // } else if (this.image.transparency.indexed) {
    //   // Create a transparency SMask for the image based on the data
    //   // in the PLTE and tRNS sections. See below for details on SMasks.
    //   dataDecoded = true;
    //   return this.loadIndexedAlphaChannel();
    // } else if (hasAlphaChannel) {
    //   // For PNG color types 4 and 6, the transparency data is stored as a alpha
    //   // channel mixed in with the main image data. Separate this data out into an
    //   // SMask object and store it separately in the PDF.
    //   dataDecoded = true;
    //   return this.splitAlphaChannel();
    // }

    // if (isInterlaced && !dataDecoded) {
    //   return this.decodeData();
    // }

    this.finalize();
  }

  finalize() {
    if (this.alphaChannel) {
      const sMask = this.document.ref({
        Type: 'XObject',
        Subtype: 'Image',
        Height: this.height,
        Width: this.width,
        BitsPerComponent: 8,
        Filter: 'FlateDecode',
        ColorSpace: 'DeviceGray',
        Decode: [0, 1]
      });

      sMask.end(zlibSync(this.alphaChannel));
      this.obj.data['SMask'] = sMask;
    }

    // add the actual image data
    this.obj.end(zlibSync(this.imgData));

    // free memory
    this.image = null;
    return (this.imgData = null);
  }

  splitAlphaChannel(rgbaChannel) {
    const pixelCount = Math.floor(rgbaChannel.length / 4);

    const rgbChannel = new Uint8Array(pixelCount * 3);
    const alphaChannel = new Uint8Array(pixelCount * 1);

    let rgbaOffset = 0;
    let rgbOffset = 0;
    let alphaOffset = 0;

    while (rgbaOffset < rgbaChannel.length) {
      rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
      rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
      rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
      alphaChannel[alphaOffset++] = rgbaChannel[rgbaOffset++];
    }

    this.alphaChannel = alphaChannel.some(a => a < 255)
      ? alphaChannel
      : undefined;
    this.imgData = rgbChannel;
  }

  // loadIndexedAlphaChannel() {
  //   const transparency = this.image.transparency.indexed;
  //   return this.image.decodePixels(pixels => {
  //     const alphaChannel = Buffer.alloc(this.width * this.height);

  //     let i = 0;
  //     for (let j = 0, end = pixels.length; j < end; j++) {
  //       alphaChannel[i++] = transparency[pixels[j]];
  //     }

  //     this.alphaChannel = zlibSync(alphaChannel);
  //     return this.finalize();
  //   });
  // }

  // decodeData() {
  //   this.image.decodePixels(pixels => {
  //     this.imgData = zlibSync(pixels);
  //     this.finalize();
  //   });
  // }
}

export default PNGImage;
