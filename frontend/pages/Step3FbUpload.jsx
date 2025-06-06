import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import "./style/Step3FbUpload.css";

import emailjs from "emailjs-com";

const API_ENDPOINTS = {
  GET_TOKEN: "/api/get-token",
  STORE_TOKEN: "/api/store-token",
};

const Step3FbUpload = ({
  product,
  onBack,
  onNext,
  companyId,
  image,
  title,
  description,
  reset,
}) => {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [similarUsers, setSimilarUsers] = useState([]);
  
  // Email states
  const [emailSending, setEmailSending] = useState(false);
  const [emailsSent, setEmailsSent] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [sentCount, setSentCount] = useState(0);

  console.log("token in Step3FbUpload:", token);

  const findSimilarUser = async () => {
    console.log("Finding similar users for product:", product.slug);
    const res = await axios.get(
      `https://autobuzz-waitlist.onrender.com/api/similarity/product/${product.slug}/similar-users`
    );

    console.log("Response from similar users API:", res.data);
    const users = res.data.data.similarUsers;
    setSimilarUsers(users);
    console.log("similar users:", users);
    return users;
  };

  const fetchToken = useCallback(async (nodeId, companyId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(API_ENDPOINTS.GET_TOKEN, {
        params: {
          company_id: companyId,
          key: nodeId,
        },
        timeout: 5000,
      });

      if (response.status === 200) {
        return response.data.token || "";
      }
      throw new Error("Failed to fetch token");
    } catch (err) {
      console.error("Error fetching token:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred while fetching token"
      );
      return "";
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchAndSetToken = async () => {
      const token = await fetchToken("facebook_access_token", companyId);
      setToken(token);
    };

    fetchAndSetToken();
  }, [companyId, fetchToken]);

  const sendEmail = async (name, email, subject, message, image) => {
    try {
      const response = await emailjs.send(
        "service_395xd0o",
        "template_ax959qb",
        {
          fname: name,
          email: email,
          subject: subject,
          message: message,
          image: image,
        },
        "ZfkMHUs_Wx679UaLu"
      );

      if (response.status === 200) {
        console.log("Email sent successfully!");
        return true;
      }
    } catch (error) {
      console.log("Email failed:", error);
      return false;
    }
  };

  const handleSendEmails = async () => {
    try {
      setEmailSending(true);
      setEmailError(null);
      setSentCount(0);
      
      const users = await findSimilarUser();
      
      if (users.length === 0) {
        setEmailError("No similar users found");
        return;
      }

      let successCount = 0;
      
      for (const user of users) {
        const success = await sendEmail(
          user.name,
          user.email,
          `New Product: ${title}`,
          description,
          image
        );
        
        if (success) {
          successCount++;
          setSentCount(successCount);
        }
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (successCount > 0) {
        setEmailsSent(true);
        console.log(`Successfully sent ${successCount}/${users.length} emails`);
      } else {
        setEmailError("Failed to send any emails");
      }
      
    } catch (error) {
      console.error("Error sending emails:", error);
      setEmailError("Failed to send emails. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleFacebookUpload = async () => {
    setUploading(true);
    setUploadError(null);
    const padeIdURL = `https://graph.facebook.com/v23.0/me?access_token=${token}`;

    const pageIdResponse = await axios.get(padeIdURL);
    const pageId = pageIdResponse.data.id;

    console.log("Page ID:", pageId);

    const endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;

    const payload = {
      url: image,
      caption: `${title}\n\n${description}`,
      access_token: token,
    };

    try {
      const response = await axios.post(endpoint, payload);
      console.log("Photo posted:", response.data);
      setSuccess(true);
      return response.data;
    } catch (error) {
      console.error(
        "Error posting photo:",
        error.response?.data || error.message
      );
      setUploadError("Failed to upload to Facebook. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="step-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading Facebook token...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Token Error</h3>
          <p>{error}</p>
          <button
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container">
      {/* Header */}
      <div className="step-header">
        <div className="step-indicator">
          <span className="step-number">3</span>
        </div>
        <div className="step-info">
          <h1 className="step-title">Upload to Facebook</h1>
          <p className="step-subtitle">Review and publish your content</p>
        </div>
      </div>

      {/* Content Preview */}
      <div className="content-preview">
        <div className="preview-card">
          <div className="image-section">
            {image && (
              <div className="image-container">
                <img
                  src={image}
                  alt="Content preview"
                  className="preview-image"
                />
              </div>
            )}
          </div>

          <div className="content-section">
            <div className="content-field">
              <label className="field-label">Title</label>
              <h3 className="field-value title-value">{title}</h3>
            </div>

            <div className="content-field">
              <label className="field-label">Description</label>
              <p className="field-value description-value">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Status */}
      {uploadError && (
        <div className="status-message error-message">
          <span className="status-icon">❌</span>
          <span>{uploadError}</span>
        </div>
      )}

      {success && (
        <div className="status-message success-message">
          <span className="status-icon">✅</span>
          <span>Successfully uploaded to Facebook</span>
        </div>
      )}

      {/* Email Status */}
      {emailError && (
        <div className="status-message error-message">
          <span className="status-icon">❌</span>
          <span>{emailError}</span>
        </div>
      )}

      {emailsSent && (
        <div className="status-message success-message">
          <span className="status-icon">✅</span>
          <span>Successfully sent {sentCount} emails</span>
        </div>
      )}

      {/* Upload Button */}
      <div className="upload-section">
        <button
          className={`upload-btn ${success ? "success" : ""} ${
            uploading ? "loading" : ""
          }`}
          onClick={handleFacebookUpload}
          disabled={uploading || success || !token}
        >
          {uploading && <div className="btn-spinner"></div>}
          <span className="btn-text">
            {uploading
              ? "Uploading..."
              : success
              ? "Uploaded Successfully"
              : "Upload to Facebook"}
          </span>
          {success && <span className="success-icon">✓</span>}
        </button>
      </div>

      {/* Email Button with Different States */}
      <button
        className={`upload-btn ${
          emailsSent ? "success" : emailError ? "error" : ""
        } ${emailSending ? "loading" : ""}`}
        onClick={handleSendEmails}
        disabled={emailSending || emailsSent}
      >
        {emailSending && <div className="btn-spinner"></div>}
        <span className="btn-text">
          {emailSending
            ? `Sending... (${sentCount}/${similarUsers.length})`
            : emailsSent
            ? `Sent ${sentCount} Email(s) ✓`
            : emailError
            ? "Failed to Send Emails"
            : similarUsers.length > 0
            ? `Send Emails to ${similarUsers.length} Users`
            : "Send Emails to Interested Users"}
        </span>
        {emailsSent && <span className="success-icon">✓</span>}
        {emailError && <span className="error-icon">⚠️</span>}
      </button>

      {/* Navigation */}
      <div className="navigation">
        <button
          className="nav-btn secondary"
          onClick={onBack}
          disabled={uploading || emailSending}
        >
          Back
        </button>
        <button
          className="nav-btn primary"
          onClick={reset}
          disabled={uploading || emailSending}
        >
          Finish
        </button>
      </div>
    </div>
  );
};

export default Step3FbUpload;