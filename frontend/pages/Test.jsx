import React, { useCallback, useState, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./style/home.css";

// Constants
const NODE_COLORS = {
  DEFAULT: "#ff6b35",
  FYND: "#3b82f6",
  FACEBOOK: "#1877f2",
  GRAY: "#6b7280",
};

const API_ENDPOINTS = {
  GET_TOKEN: "/api/get-token",
  STORE_TOKEN: "/api/store-token",
};

const TOKEN_INPUT_PLACEHOLDERS = {
  FYND_APP_ID: "Enter your Fynd platform Application ID here...",
  FYND_TOKEN: "Generated platform Token here...",
  FACEBOOK: "Enter your Facebook Access Token here...",
  GENERIC: "Enter API tokens or credentials...",
};

/**
 * CustomNode component represents a visual node in the flow diagram
 */
const CustomNode = ({ data }) => {
  const { label, icon, color = NODE_COLORS.DEFAULT } = data;

  return (
    <div className="custom-node" style={{ borderColor: color }}>
      <Handle
        type="target"
        position={Position.Left}
        className="node-handle"
        style={{ background: color }}
      />

      <div className="node-content">
        <div className="node-main">
          <div className="node-icon" style={{ backgroundColor: color }}>
            {icon}
          </div>
          <div className="node-label">{label}</div>
        </div>
        <div className="node-actions">
          <button className="node-action-button" aria-label="Quick action">
            <span className="action-icon">⚡</span>
          </button>
          <button className="node-action-button" aria-label="More options">
            <span className="action-icon">⋮</span>
          </button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="node-handle"
        style={{ background: color }}
      />
    </div>
  );
};

/**
 * NodeSidebar component displays details and configuration for the selected node
 */
const NodeSidebar = ({ selectedNode, onClose, onTokenSave, company_id }) => {
  const [tokens, setTokens] = useState("");
  const [activeTab, setActiveTab] = useState("description" > "tokens");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fyndAppId, setFyndAppId] = useState("");
  const [fyndPlatformToken, setFyndPlatformToken] = useState("");

  /**
   * Fetches token for a node from the backend API
   */
  const fetchToken = useCallback(async (nodeId, companyId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(API_ENDPOINTS.GET_TOKEN, {
        params: {
          company_id: companyId,
          key: nodeId,
        },
        timeout: 5000, // 5 second timeout
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

  // Fetch token when selected node changes
  useEffect(() => {
    if (!selectedNode) return;

    const fetchAndSetToken = async () => {
      const token = await fetchToken(selectedNode.data.label, company_id);
      setTokens(token);
    };

    fetchAndSetToken();
  }, [selectedNode, company_id, fetchToken]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await onTokenSave(tokens);
    } catch (err) {
      console.error("Error saving token:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred while saving token"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = () => {
    try {
      if (!fyndAppId || !fyndPlatformToken) {
        setError("Both App ID and Platform Token are required");
        return;
      }

      const rawString = `${fyndAppId}:${fyndPlatformToken}`;
      const encodedToken = btoa(rawString);
      setTokens(`Basic ${encodedToken}`);
      setError(null);
    } catch (err) {
      console.error("Error generating token:", err);
      setError("Failed to generate token");
    }
  };

  if (!selectedNode) return null;

  return (
    <div className="node-sidebar">
      <div className="sidebar-header">
        <div className="header-content">
          <div
            className="node-icon"
            style={{ backgroundColor: selectedNode.data.color }}
            aria-label={`${selectedNode.data.label} icon`}
          >
            {selectedNode.data.icon}
          </div>
          <h2 className="node-title">{selectedNode.data.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="close-button"
          aria-label="Close sidebar"
        >
          ×
        </button>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`tab-button ${activeTab === "tokens" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("tokens")}
          aria-selected={activeTab === "tokens"}
        >
          Tokens
        </button>
        <button
          className={`tab-button ${
            activeTab === "description" ? "active-tab" : ""
          }`}
          onClick={() => setActiveTab("description")}
          aria-selected={activeTab === "description"}
        >
          Description
        </button>
      </div>

      <div className="sidebar-content">
        {error && <div className="error-message">{error}</div>}

        {activeTab === "tokens" ? (
          loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <div className="tokens-content">
              {selectedNode.data.input ? (
                selectedNode.id === "1" ? (
                  selectedNode.data.input(
                    fyndAppId,
                    setFyndAppId,
                    fyndPlatformToken,
                    setFyndPlatformToken,
                    tokens,
                    setTokens,
                    handleGenerateToken
                  )
                ) : (
                  selectedNode.data.input(tokens, setTokens)
                )
              ) : (
                <div className="input-group">
                  <label className="input-label">Access Token</label>
                  <textarea
                    value={tokens}
                    onChange={(e) => setTokens(e.target.value)}
                    placeholder={TOKEN_INPUT_PLACEHOLDERS.GENERIC}
                    className="token-textarea"
                    aria-label="Token input"
                  />
                </div>
              )}

              <div className="button-group">
                <button
                  onClick={handleSave}
                  className="save-button"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Tokens"}
                </button>
                <button onClick={onClose} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="description-content">
            {selectedNode.data.description || "No description available."}
          </div>
        )}
      </div>
    </div>
  );
};

// Node definitions with descriptions
const initialNodes = [
  {
    id: "1",
    type: "customNode",
    position: { x: 50, y: 100 },
    data: {
      label: "Fynd Platform Webhook",
      icon: "F",
      color: NODE_COLORS.FYND,
      description: (
        <div>
          <h3>Fynd Platform Webhook Node</h3>
          <p>
            This node connects to the Fynd Platform's webhook system to receive
            real-time events and data updates.
          </p>
          <p>
            <strong>Common Use Cases:</strong>
          </p>
          <ul>
            <li>Order creation/updates</li>
            <li>Inventory changes</li>
            <li>Product updates</li>
            <li>Customer activity</li>
          </ul>
        </div>
      ),
      input: (
        fyndAppId,
        setFyndAppId,
        fyndPlatformToken,
        setFyndPlatformToken,
        tokens,
        setTokens,
        handleGenerateToken
      ) => (
        <div className="input-group">
          <label className="input-label">Fynd Platform Application ID</label>
          <input
            type="text"
            value={fyndAppId}
            onChange={(e) => setFyndAppId(e.target.value)}
            placeholder={TOKEN_INPUT_PLACEHOLDERS.FYND_APP_ID}
            className="token-input"
            aria-label="Fynd App ID input"
          />
          <label className="input-label">Fynd Platform Token</label>
          <input
            value={fyndPlatformToken}
            onChange={(e) => setFyndPlatformToken(e.target.value)}
            placeholder={TOKEN_INPUT_PLACEHOLDERS.FYND_TOKEN}
            type="password"
            className="token-input"
            aria-label="Fynd Token input"
          />
          <button
            className="save-button"
            onClick={handleGenerateToken}
            disabled={!fyndAppId || !fyndPlatformToken}
            style={{ marginBottom: "10px" }}
          >
            Generate Token
          </button>
          <label className="input-label">Generated Token</label>
          <input
            type="text"
            value={tokens}
            className="token-input"
            readOnly
            aria-label="Generated token display"
          />
          <p className="input-hint">
            Enter API tokens, access keys, or authentication credentials for
            this node.
          </p>
        </div>
      ),
    },
  },
  {
    id: "2",
    type: "customNode",
    position: { x: 350, y: 50 },
    data: {
      label: "Fetch prodct data from Fynd Platform",
      icon: "F",
      color: NODE_COLORS.FYND,
      description: (
        <div>
          <h3>Fynd Commerce Storefront Node</h3>
          <p>
            This node represents a Fynd Commerce storefront instance that
            processes e-commerce events and data.
          </p>
          <p>
            <strong>Key Features:</strong>
          </p>
          <ul>
            <li>Handles product catalog data</li>
            <li>Processes customer orders</li>
            <li>Manages cart operations</li>
            <li>Integrates with payment gateways</li>
          </ul>
        </div>
      ),
    },
  },
  {
    id: "3",
    type: "customNode",
    position: { x: 600, y: 150 },
    data: {
      label: "Payload extraction",
      icon: "f",
      color: NODE_COLORS.DEFAULT,
      description: (
        <div>
          <h3>Function Node</h3>
          <p>
            This node performs custom data transformation and business logic
            processing.
          </p>
          <p>
            <strong>Capabilities:</strong>
          </p>
          <ul>
            <li>Data transformation</li>
            <li>Conditional routing</li>
            <li>Custom business logic</li>
            <li>Payload manipulation</li>
          </ul>
        </div>
      ),
    },
  },
  {
    id: "4",
    type: "customNode",
    position: { x: 900, y: 100 },
    data: {
      label: "Advertisement Generator",
      icon: "□",
      color: NODE_COLORS.GRAY,
      description: (
        <div>
          <h3>Log Console Node</h3>
          <p>
            This node captures and displays logs for debugging and monitoring
            purposes.
          </p>
          <p>
            <strong>Features:</strong>
          </p>
          <ul>
            <li>Real-time log display</li>
            <li>Error tracking</li>
            <li>Event timestamping</li>
            <li>Log filtering</li>
          </ul>
        </div>
      ),
    },
  },
  {
    id: "5",
    type: "customNode",
    position: { x: 1200, y: 50 },
    data: {
      label: "facebook uploader",
      icon: "f",
      color: NODE_COLORS.FACEBOOK,
      description: (
        <div>
          <h3>Facebook Integration Node</h3>
          <p>
            This node connects to Facebook's APIs to enable social media
            integration features.
          </p>

          <p>
            <strong>Setup Instructions:</strong>
          </p>
          <ol>
            <li>
              Go to the{" "}
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook Developers Console
              </a>
            </li>
            <li>Create a new app or select an existing one</li>
            <li>Navigate to the "Settings" section of your app</li>
            <li>Under "Basic Settings," find the "App ID" and "App Secret"</li>
            <li>Generate a user access token with the necessary permissions</li>
            <li>Copy the access token and paste it in the Tokens tab</li>
          </ol>

          <div className="video-link">
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook API setup tutorial"
            >
              Watch the video tutorial
            </a>
          </div>
        </div>
      ),
      input: (tokens, setTokens) => (
        <div className="input-group">
          <label className="input-label">Facebook Access Token</label>
          <textarea
            value={tokens}
            onChange={(e) => setTokens(e.target.value)}
            placeholder={TOKEN_INPUT_PLACEHOLDERS.FACEBOOK}
            className="token-textarea"
            aria-label="Facebook token input"
          />
          <p className="input-hint">
            Keep your tokens secure. They provide access to your Facebook
            account.
          </p>
        </div>
      ),
    },
  },
];

const initialEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    type: "smoothstep",
    style: { stroke: NODE_COLORS.DEFAULT, strokeWidth: 2 },
    markerEnd: {
      type: "arrowclosed",
      color: NODE_COLORS.DEFAULT,
    },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    type: "smoothstep",
    style: { stroke: NODE_COLORS.DEFAULT, strokeWidth: 2 },
    markerEnd: {
      type: "arrowclosed",
      color: NODE_COLORS.DEFAULT,
    },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    type: "smoothstep",
    style: { stroke: NODE_COLORS.DEFAULT, strokeWidth: 2 },
    markerEnd: {
      type: "arrowclosed",
      color: NODE_COLORS.DEFAULT,
    },
  },
  {
    id: "e4-5",
    source: "4",
    target: "5",
    type: "smoothstep",
    style: { stroke: NODE_COLORS.DEFAULT, strokeWidth: 2 },
    markerEnd: {
      type: "arrowclosed",
      color: NODE_COLORS.DEFAULT,
    },
  },
];

const nodeTypes = {
  customNode: CustomNode,
};

/**
 * Main ReactFlowUI component that renders the flow diagram and manages state
 */
const ReactFlowUI = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const { company_id } = useParams();
  const [showBanner, setShowBanner] = useState(true);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  /**
   * Saves the token to the backend API
   */
  const saveToken = useCallback(
    async (token) => {
      if (!selectedNode) return;

      try {
        const response = await axios.post(
          API_ENDPOINTS.STORE_TOKEN,
          {
            token: token,
            key: selectedNode.data.label,
            company_id,
          },
          { timeout: 5000 }
        );

        if (response.status === 200) {
          // Update local node state with the new token
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === selectedNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    tokens: token,
                  },
                };
              }
              return node;
            })
          );
        }
      } catch (error) {
        console.error("Error saving token:", error);
        throw error;
      }
    },
    [selectedNode, company_id, setNodes]
  );

  return (
    <div className="reactflow-container">
      {showBanner && (
        <div className="banner" role="alert">
          <p className="banner-text">
            Click on any node to configure its API keys or tokens
          </p>
          <button
            className="close-banner-button"
            onClick={() => setShowBanner(false)}
            aria-label="Close banner"
          >
            ×
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedNode(node)}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls className="flow-controls" />
        <MiniMap
          className="flow-minimap"
          nodeColor={(node) => node.data?.color || NODE_COLORS.DEFAULT}
          zoomable
          pannable
        />
        <Background
          variant="dots"
          gap={12}
          size={1}
          color="#e5e7eb"
          className="flow-background"
        />
      </ReactFlow>

      <NodeSidebar
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onTokenSave={saveToken}
        company_id={company_id || ""}
      />
    </div>
  );
};

export default ReactFlowUI;
