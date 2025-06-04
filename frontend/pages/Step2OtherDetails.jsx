import React, { useState } from "react";
import axios from "axios";
import "./style/Step2GeneratedContent.css";

const Step2GeneratedContent = ({
  product,
  onBack,
  onNext,
  companyId,
  setTitle,
  setDescription,
  setImage,
  title,
  description,
}) => {
  const [generatedContent, setGeneratedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState({
    price: 1100,
    effectivePrice: 900,
    currency: "INR",
  });

  const generateContent = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `https://autobuzz-backend.onrender.com/products/${companyId}`,
        { product: product }
      );
      setGeneratedContent(res.data);
      setTitle(res.data.generatedTitle);
      setDescription(res.data.generatedDescription);
      setPrice(res.data.pricing);
      setImage(res.data.bannerAdImage);
    } catch (error) {
      console.error("Failed to generate content", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step2-container">
      {/* Header */}
      <div className="step2-header">
        <div className="step-indicator">
          <span className="step-number">2</span>
        </div>
        <div className="step-info">
          <h1 className="step-title">Generate Content</h1>
          <p className="step-subtitle">
            AI-powered content creation for your product
          </p>
        </div>
      </div>

      {/* Selected Product */}
      <div className="selected-product">
        <label className="section-label">Selected Product</label>
        <div className="product-card">
          <div className="product-image-section">
            <img
              src={product.media?.[0]?.url || "https://via.placeholder.com/100"}
              alt={product.name}
              className="product-image"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/100";
              }}
            />
          </div>
          <div className="product-info-section">
            <h3 className="product-name">{product.name}</h3>
            <p className="product-detail">Code: {product.item_code}</p>
            <p className="product-detail">
              Brand: {product.brand?.name || "Generic"}
            </p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="generate-section">
        <button
          className="generate-button"
          onClick={generateContent}
          disabled={loading || generatedContent}
        >
          {loading && <div className="loading-spinner"></div>}
          <span>{loading ? "Generating Content..." : "Generate Content"}</span>
        </button>
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="generated-content-section">
          <label className="section-label">Generated Content</label>
          <div className="content-preview-card">
            <div className="image-wrapper">
              <img
                src={generatedContent.bannerAdImage}
                alt="Generated Ad Banner"
                className="banner-image"
              />
            </div>
            <div className="content-text">
              <div className="content-field">
                <label className="field-label">Ad Title</label>
                <input
                  type="text"
                  className="title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your ad title"
                />
              </div>

              <div className="content-field">
                <label className="field-label">Description</label>
                <textarea
                  className="description-textarea"
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter your product description"
                />
              </div>

              <div className="content-field">
                <label className="field-label">Pricing Information</label>
                <div className="pricing-info">
                  <div className="pricing-item">
                    <span className="pricing-label">Original Price:</span>
                    <span className="pricing-value">₹{price.price}</span>
                  </div>
                  <div className="pricing-item">
                    <span className="pricing-label">Effective Price:</span>
                    <span className="pricing-value">
                      ₹{price.effectivePrice}
                    </span>
                  </div>
                  <div className="pricing-item">
                    <span className="pricing-label">Currency:</span>
                    <span className="pricing-value">{price.currency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="navigation">
        <button className="nav-btn secondary" onClick={onBack}>
          Back
        </button>
        {generatedContent && (
          <button className="nav-btn primary" onClick={onNext}>
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default Step2GeneratedContent;
