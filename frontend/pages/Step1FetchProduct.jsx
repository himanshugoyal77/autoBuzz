import React, { useEffect, useState } from "react";
import axios from "axios";
import "./style/Step1FetchProduct.css";
import { useParams } from "react-router-dom";

const Step1FetchProduct = ({ companyId, onNext, onProductSelect }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    try {
      const res = await axios.get(
        `https://autobuzz-backend.onrender.com/api/v1/getProductByCompanyId/${companyId}`
      );
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.brand?.name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const handleSelect = (product) => {
    onProductSelect(product);
    onNext();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="product-selection-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-selection-container">
      {/* Header */}
      <div className="step1-header">
        <div className="step1-indicator">
          <span className="step1-number">1</span>
        </div>
        <div className="step1-info">
          <h1 className="step1-title">Select Product</h1>
          <p className="step1-subtitle">
            Choose a product to generate marketing content
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search products by name, code, or brand..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="clear-search-btn"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="search-results-count">
            {filteredProducts.length} product
            {filteredProducts.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <p className="no-products-message">
          No products found for this company. Please add products to get
          started.
        </p>
      ) : filteredProducts.length === 0 ? (
        <div className="no-search-results">
          <p>No products match your search criteria.</p>
          <button onClick={clearSearch} className="clear-search-link">
            Clear search to view all products
          </button>
        </div>
      ) : (
        <div className="">
          <div className="products-grid products-grid-3-columns">
            {filteredProducts.map((product) => (
              <div
                key={product._id}
                className="product-selection-card"
                onClick={() => handleSelect(product)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(product);
                  }
                }}
                aria-label={`Select ${product.name}`}
              >
                <div className="product-image-container">
                  <img
                    src={
                      product.media?.[0]?.url ||
                      "https://via.placeholder.com/150"
                    }
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/150";
                    }}
                  />
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-code">Code: {product.item_code}</p>
                  <p className="product-brand">
                    Brand: {product.brand?.name || "Generic"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Step1FetchProduct;
