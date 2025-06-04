import React, { useCallback, useEffect, useState } from "react";
import "./style/FacebookTokenPage.css";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReactFlowUI from "./Test";
import MultiStepForm from "./MultiStepForm";

const API_ENDPOINTS = {
  GET_TOKEN: "/api/get-token",
  STORE_TOKEN: "/api/store-token",
};

const FacebookTokenPage = () => {
  const { company_id } = useParams();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sample product data - replace with your actual data
  const [products] = useState([
    {
      name: "Yellow Sandal",
      code: "GR45G",
      brand: "Generic",
    },
    {
      name: "Yellow Sandal",
      code: "GR45G",
      brand: "Generic",
    },
    {
      name: "Mens Casual",
      code: "DSPW4.54",
      brand: "Generic",
    },
  ]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
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
      const token = await fetchToken("facebook_access_token", company_id);
      setToken(token);
    };

    fetchAndSetToken();
  }, [company_id, fetchToken]);

  const saveToken = useCallback(
    async (token) => {
      try {
        const response = await axios.post(
          API_ENDPOINTS.STORE_TOKEN,
          {
            token: token,
            key: "facebook_access_token",
            company_id,
          },
          { timeout: 5000 }
        );

        if (response.status === 200) {
          console.log("Token saved successfully:", response.data);
          setToken(token);
          setShowEditor(false);
          alert("Token saved successfully!");
        }
      } catch (error) {
        console.error("Error saving token:", error);
        throw error;
      }
    },
    [company_id]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    saveToken(token);
  };

  if (loading) return <div className="loading-message">Loading token...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  if (token && !showEditor) {
    return (
      <div className="flow-ui-wrapper">
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <button className="collapse-button" onClick={toggleSidebar}>
            {sidebarCollapsed ? "»" : "«"}
          </button>
          {!sidebarCollapsed && (
            <>
              <button
                className="edit-button"
                onClick={() => setShowEditor(true)}
              >
                Edit Token
              </button>
            </>
          )}
        </aside>
        <div className="flow-ui-content">
          <MultiStepForm />
        </div>
      </div>
    );
  }

  return (
    <div className="token-container">
      <div className="token-box">
        <h2>Connect Your Facebook Account</h2>
        <p className="instructions">
          To continue, please provide your{" "}
          <strong>Facebook Access Token</strong>. This will allow us to manage
          your Facebook pages and posts.
        </p>

        <ol className="instruction-list">
          <li>
            Go to the{" "}
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook Graph API Explorer
            </a>
          </li>
          <li>
            Select your app and generate a user access token with the required
            permissions (e.g., <code>pages_read_engagement</code>,{" "}
            <code>pages_manage_posts</code>).
          </li>
          <li>Copy the token and paste it below.</li>
        </ol>

        <form onSubmit={handleSubmit} className="token-form">
          <label htmlFor="fb-token">Facebook Access Token</label>
          <input
            type="text"
            id="fb-token"
            placeholder="Paste your token here"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <div className="button-group">
            <button type="submit" className="submit-button">
              Save Token
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowEditor(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacebookTokenPage;
