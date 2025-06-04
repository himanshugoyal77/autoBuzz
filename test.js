const axios = require("axios");

const upload = async (data) => {
  try {
    const res = await axios.post(
      "https://api.cloudinary.com/v1_1/dw3bphpot/image/upload",
      data,
      {
        withCredentials: false,
        headers: {
          "Content-Type": "multipart/form-data",
          
        },
      }
    );
    const { url } = res.data;
    console.log(url);
    return url;
  } catch (err) {
    console.log(err);
  }
  console.log(data);
};

const get = async (image) => {
  const formData = new FormData();
  formData.append(
    "prompt",
    "generate a premium quality advertisement image for a new product launch of the attached image. Add text elements like 'buy now!', make it eye catching and fansy."
  );
  formData.append("model", "google/gemini-2.0-flash-exp:free");
  formData.append("quality", "auto");

  // Add your image files (up to 16)
  const imageFile1 = await fetch(image).then((r) => r.blob());
  formData.append("image[]", imageFile1);

  const response = await fetch(
    "https://ir-api.myqa.cc/v1/openai/images/edits",
    {
      method: "POST",
      headers: {
        Authorization:
          "Bearer e2745688600103bd2eca0d49ab3898fda71ce39f37a2d710867948f7f9df69c0",
      },
      body: formData,
    }
  );

  const data = await response.json();
  console.log(data);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const encoded_image = data.data[0].b64_json;

  // Save the image to a file
  const buffer = Buffer.from(encoded_image, "base64");
  const fs = require("fs");
  fs.writeFileSync("output_image.png", buffer);
  console.log("Image saved as output_image.png");

  // Upload the image to Cloudinary - FIXED VERSION
  const cloudinaryData = new FormData();

  // Convert base64 to blob for proper FormData handling
  const imageBuffer = Buffer.from(encoded_image, "base64");
  const imageBlob = new Blob([imageBuffer], { type: "image/png" });

  cloudinaryData.append("file", imageBlob, "output_image.png");
  cloudinaryData.append("upload_preset", "dw3bphpot");

  const cloudinaryUrl = await upload(cloudinaryData);
  return cloudinaryUrl;
};

get(
  "https://maisoli.in/cdn/shop/files/2_2775676b-7c9f-437d-a2c8-ff1a4d546827.jpg?v=1742798439&width=1445"
);
