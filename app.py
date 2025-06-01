from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import json
import requests
from typing import Dict, Any, Optional, List
import base64
from io import BytesIO
from PIL import Image
import os
from img import generate_and_upload_ad_images

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class ProductAdGenerator:
    def __init__(self, openrouter_api_key: str):
        """
        Initialize the Product Ad Generator with OpenRouter Gemini Flash
        
        Args:
            openrouter_api_key (str): Your OpenRouter API key
        """
        self.api_key = openrouter_api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "google/gemini-flash-1.5"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "http://localhost:5000",  # Optional: your app's URL
            "X-Title": "Product Ad Generator"  # Optional: your app's name
        }
    
    def extract_product_info(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant product information from the product data
        
        Args:
            product_data (Dict): Product data in the given format
            
        Returns:
            Dict: Extracted product information including images
        """
        attributes = product_data.get('attributes', {})
        medias = product_data.get('medias', [])
        
        # Extract image URLs
        image_urls = [media['url'] for media in medias if media.get('type') == 'image']
        
        # Extract key product details
        product_info = {
            'name': product_data.get('name', 'Unknown Product'),
            'brand': attributes.get('brand_name', 'Unknown Brand'),
            'category': ', '.join(attributes.get('l3_category_names', ['Fashion Item'])),
            'color': attributes.get('color', attributes.get('primary_color', 'Unknown')),
            'material': attributes.get('primary_material', 'Unknown'),
            'gender': ', '.join(attributes.get('gender', ['Unisex'])),
            'country_of_origin': attributes.get('country_of_origin', 'Unknown'),
            'price': attributes.get('min_price_effective', 'Unknown'),
            'discount': attributes.get('discount', 0),
            'existing_description': product_data.get('description', ''),
            'department': attributes.get('departments', 'Fashion'),
            'image_urls': image_urls,
            'primary_image': image_urls[0] if image_urls else None,
            'all_images': image_urls
        }
        
        return product_info
    
    def generate_content_with_gemini(self, prompt: str) -> Optional[str]:
        """
        Generate content using OpenRouter Gemini Flash API
        
        Args:
            prompt (str): The prompt to send to Gemini Flash
            
        Returns:
            Optional[str]: Generated content or None if failed
        """
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.8,
            "max_tokens": 600,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0
        }
        
        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
            
        except requests.exceptions.RequestException as e:
            print(f"Error calling OpenRouter Gemini Flash API: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response status: {e.response.status_code}")
                print(f"Response body: {e.response.text}")
            return None
        except (KeyError, IndexError) as e:
            print(f"Error parsing OpenRouter Gemini Flash response: {e}")
            return None
    
    def generate_creative_title(self, product_info: Dict[str, str]) -> str:
        """
        Generate a creative, advertising-style title using OpenRouter Gemini Flash
        
        Args:
            product_info (Dict): Extracted product information
            
        Returns:
            str: Generated creative title
        """
        prompt = f"""
You're a social media copywriter tasked with creating a compelling, creative, and scroll-stopping title for a Facebook ad.

Product:
- Name: {product_info['name']}
- Brand: {product_info['brand']}
- Category: {product_info['category']}
- Color: {product_info['color']}
- Target Gender: {product_info['gender']}
- Discount: {product_info['discount']}%

Write a short, punchy title that:
- Is under 60 characters
- Instantly grabs attention
- Feels emotional, trendy, or aspirational
- Uses emojis only if it feels natural
- Would look great on Facebook or Instagram

Examples: "Slay Every Day ✨", "Feel the Luxe 💎", "Style That Speaks 🔥"

Respond only with the title.
"""

        title = self.generate_content_with_gemini(prompt)
        return title if title else f"✨ {product_info['name']} - Style Redefined! ✨"
    
    def generate_creative_description(self, product_info: Dict[str, str]) -> str:
        """
        Generate a creative advertising description using OpenRouter Gemini Flash
        
        Args:
            product_info (Dict): Extracted product information
            
        Returns:
            str: Generated creative description
        """
        prompt = f"""
You're an expert Facebook ad copywriter. Write a compelling, clear, and informative product description for a fashion item, designed to convert viewers into buyers.

Product Info:
- Name: {product_info['name']}
- Brand: {product_info['brand']}
- Category: {product_info['category']}
- Color: {product_info['color']}
- Material: {product_info['material']}
- Gender: {product_info['gender']}
- Made in: {product_info['country_of_origin']}
- Price: ₹{20 if product_info['price'] == 0 else product_info['price']}
- Discount: {20 if product_info['discount'] == 0 else product_info['discount']}%

Guidelines:
- Start with a strong hook or value statement
- Clearly describe the product's look, feel, and benefits
- Mention brand, material, color, and craftsmanship
- Highlight current discount and pricing deal
- Keep tone persuasive but not over-the-top
- Add 1-2 emojis max for flair
- Max length: 100 words
- Finish with: "🛍️ Shop now: [Buy Link]"

Only include the description, no headings or explanations.
"""

        description = self.generate_content_with_gemini(prompt)
        
        # Add buy link at the end
        if description:
            description += "\n\nShop now: https://example.com/buy-now"
        else:
            description = f"Discover the {product_info['name']} by {product_info['brand']} - a stylish {product_info['color']} {product_info['category'].lower()} made from {product_info['material']}. Made in {product_info['country_of_origin']}. Get it now for ₹{product_info['price']} with {product_info['discount']}% off! 🛍️\n\nShop now: https://example.com/buy-now"
        
        return description
    
    def create_creative_ad(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a complete creative ad with image, title, and description
        
        Args:
            product_data (Dict): Product data in the given format
            
        Returns:
            Dict: Creative ad content
        """
        # Extract product information
        product_info = self.extract_product_info(product_data)
        
        # Generate creative content
        title = self.generate_creative_title(product_info)
        description = self.generate_creative_description(product_info)
        
        # Calculate offer price if discount exists
        original_price = product_info['price']
        discount = product_info['discount']
        offer_price = None
        poster = generate_and_upload_ad_images(product_info['all_images'][0],
                                    product_info['all_images'][1] if len(product_info['all_images']) > 1 else product_info['all_images'][0],
                                    )
        
        if isinstance(original_price, (int, float)) and discount > 0:
            offer_price = round(original_price * (100 - discount) / 100)
            
    
        
        return {
            'title': title,
            'description': description,
            'images': {
                'primary': product_info['primary_image'],
                'all': product_info['all_images']
            },
            'product_details': {
                'name': product_info['name'],
                'brand': product_info['brand'],
                'category': product_info['category'],
                'color': product_info['color'],
                'material': product_info['material'],
                'gender': product_info['gender']
            },
            'pricing': {
                'original_price': original_price,
                'offer_price': offer_price,
                'discount_percentage': discount,
                'currency': '₹'
            },
            'ad_metadata': {
                'created_for': 'social_media_advertising',
                'style': 'creative_lifestyle',
                'target_audience': product_info['gender'],
                'ai_model': 'google/gemini-flash-1.5'
            },
            'buy_link': 'https://example.com/buy-now',
            'poster': poster
        }

# Initialize the generator (you'll need to set your OpenRouter API key)
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', "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")
ad_generator = ProductAdGenerator(OPENROUTER_API_KEY)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Product Ad Generator API is running',
        'ai_model': 'google/gemini-flash-1.5',
        'provider': 'OpenRouter'
    })

@app.route('/generate-ad', methods=['POST'])
def generate_product_ad():
    """
    Generate a creative product ad
    
    Expected JSON payload: Product data in the provided format
    Returns: Creative ad with image, title, and description
    """
    try:
        # Get JSON data from request
        product_data = request.get_json()
        
        if not product_data:
            return jsonify({
                'error': 'No JSON data provided',
                'message': 'Please provide product data in the request body'
            }), 400
        
        # Validate required fields
        if 'name' not in product_data:
            return jsonify({
                'error': 'Invalid product data',
                'message': 'Product name is required'
            }), 400
        
        # Generate creative ad
        ad_result = ad_generator.create_creative_ad(product_data)
        
        return jsonify({
            'success': True,
            'message': 'Creative ad generated successfully with Gemini Flash',
            'data': ad_result
        })
    
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    print("🚀 Starting Product Ad Generator API with OpenRouter Gemini Flash...")
    print("📝 Available endpoints:")
    print("   POST /generate-ad - Generate creative product ad")
    print("   POST /generate-ad-with-image - Generate ads with AI images")
    print("   GET /health - Health check")
    print("\n💡 Don't forget to set your OPENROUTER_API_KEY environment variable!")
    print("🤖 Using: Google Gemini Flash 1.5 via OpenRouter")
    
    app.run(debug=True, host='0.0.0.0', port=5000)