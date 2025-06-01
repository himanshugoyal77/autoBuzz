from gradio_client import Client, handle_file

import base64
import uuid
from supabase import create_client, Client as SupabaseClient
import os

def save_base64_to_file(base64_str: str, file_path: str):
    with open(file_path, "wb") as f:
        f.write(base64.b64decode(base64_str))


def encode_image_to_base64(image_path: str) -> str:
    """
    Encodes an image file to a base64 string.

    Args:
        image_path (str): Path to the image file.

    Returns:
        str: Base64-encoded string of the image.
    """
    with open(image_path, "rb") as img_file:
        encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
    return encoded_string



SUPABASE_URL = "https://bsplsnobtvfihbrqvtwo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcGxzbm9idHZmaWhicnF2dHdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc2ODU5OSwiZXhwIjoyMDY0MzQ0NTk5fQ.gSMzeEGx_J3YFXlyGTONwdb4Eqx4Bj_QluJWfuGjSjc"
# SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcGxzbm9idHZmaWhicnF2dHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3Njg1OTksImV4cCI6MjA2NDM0NDU5OX0.IFBSJtduSRJQylSzK2r9F1anS-5ynWoYILhvdir-SnA"
BUCKET_NAME = "fynd"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_image_to_supabase(local_file_path: str, storage_path: str) -> str:
    # Upload the file
    with open(local_file_path, "rb") as f:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=f,
            file_options={"content-type": "image/png"},  # or jpeg/webp
        )

    # Get public URL
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
    return public_url


def generate_ad_images(image_path1: str, image_path2: str, num_outputs: int = 4):
    """
    Generate advertisement images using the Gradio Gemini model.

    Args:
        image_path1 (str): Path to the first image (e.g., product image).
        image_path2 (str): Path to the second image (e.g., background or style image).
        prompt (str): Text prompt for image generation.
        num_outputs (int): Number of generated images to request.

    Returns:
        List[str]: List of URLs or paths to the generated images.
    """
    try:
        client = Client("sunbv56/generate_edit_pic_gemini")
        result = client.predict(
            image1=handle_file(image_path1),
            image2=handle_file(image_path2),
            text="generate a premium quality advertisement image for a new product launch of the attached image. Add text elements like 'buy now!', make it eye catching and fansy.",
            num_requests=2,
            api_name="/predict"
        )
      
        # Convert the result to base64 strings if needed
        result = encode_image_to_base64(result[1]["image"])  # Assuming result[1] contains the images
        # print("Images successfully encoded to base64.")
		# # Return the list of base64-encoded image at last

        return result  # Return the last 'num_outputs' images
    except Exception as e:
        print(f"Error generating ad images: {e}")
        return None
    
def generate_and_upload_ad_images(image_path1, image_path2, num_outputs=4):
    base64_img = generate_ad_images(image_path1, image_path2, num_outputs)
    if not base64_img:
        return None

    local_path = f"{uuid.uuid4()}.jpg"
    save_base64_to_file(base64_img, local_path)
    
    

    supabase_path = f"ads/{os.path.basename(local_path)}"
    url = upload_image_to_supabase(local_path, supabase_path)

    os.remove(local_path)  # Optional: clean up
    return url


# Example usage
if __name__ == "__main__":
    output = generate_and_upload_ad_images("./sample/download.jpg", "./sample/image.webp")
    print(output)
