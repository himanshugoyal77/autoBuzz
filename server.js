const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const serveStatic = require("serve-static");
const { readFileSync } = require("fs");
const { setupFdk } = require("@gofynd/fdk-extension-javascript/express");
const {
  SQLiteStorage,
} = require("@gofynd/fdk-extension-javascript/express/storage");
const sqliteInstance = new sqlite3.Database("session_storage.db");
const productRouter = express.Router();
const axios = require("axios");

const FYND_PLATFORM_BASE_URL = "https://api.fynd.com";

const tokenMapping = {
  FB_TOKEN: "facebook1",
  FYND_PLATFORM_TOKEN: "Fynd Platform Webhook",
};

async function postPhotoToFacebookPage({ caption, image, token }) {
  const endpoint = `https://graph.facebook.com/v19.0/122095925857668/photos`;

  const payload = {
    url: image,
    caption: caption, // Title or description
    access_token: token,
    // "EACOySOKuhEoBO9IhUx25IVxZAnu9dRsZBKLaQZAeZCvPWVXExWf4xuIIMdiZB2d0UQqrZANpJXUMk2b3yLqx6Vh2bXR74DzzWoumdyUOERixC5QZBFNVJROHjN2wjbabzem1EuxZAy464F6r0pkRgNmaoRPDRWmLCZChYSHHXJaewwIDqL8hSN6DQ1QTrZCDsHewZAJEzJt3KgZC2r38F97oeb4ZD",
  };
  console.log("token in postPhotoToFacebookPage", token);
  try {
    const response = await axios.post(endpoint, payload);
    console.log("Photo posted:", response.data);
    return response.data; // Contains post ID, photo ID, etc.
  } catch (error) {
    console.error(
      "Error posting photo:",
      error.response?.data || error.message
    );
    throw error;
  }
}

const generateContent = async (payload, token) => {
  try {
    const response = await axios.post(
      "https://autobuzz-1.onrender.com/generate-ad",
      //"https://63d48t2n-5000.inc1.devtunnels.ms/generate-ad",
      payload
    );

    console.log("response", response.data);

    const { title, description, images, poster } = await response.data.data;
    console.log(images);
    await postPhotoToFacebookPage({
      caption: title + "" + description + "uploaded from fynd extension",
      image: poster || images.primary,
      token: token,
    });

    return { title, description, images, poster };
  } catch (err) {
    console.log(err);
  }
};

const getSingleProduct = async (
  slug,
  tokenPayload,
  maxRetries = 5,
  currentRetry = 0
) => {
  try {
    console.log(
      `Attempt ${currentRetry + 1} - slug:`,
      slug,
      "token:",
      tokenPayload["Fynd Platform Webhook"]?.substring(0, 20) + "..."
    );

    const response = await axios.get(
      `${FYND_PLATFORM_BASE_URL}/service/application/catalog/v1.0/products/${slug}/`,
      {
        headers: {
          Authorization: tokenPayload["Fynd Platform Webhook"],
        },
      }
    );

    console.log("Response data:", response.data);

    // Success - process the response
    await generateContent(response.data, tokenPayload[tokenMapping.FB_TOKEN]);
    return response.data;
  } catch (err) {
    console.log(`Error on attempt ${currentRetry + 1}:`, err.message);

    // Check if it's a 404 error specifically
    if (err.response?.status === 404) {
      if (currentRetry < maxRetries - 1) {
        console.log(
          `Product not found (404), retrying after 1 second... (${
            currentRetry + 1
          }/${maxRetries})`
        );
        await sleep(120000);
        return await getSingleProduct(
          slug,
          tokenPayload,
          maxRetries,
          currentRetry + 1
        );
      } else {
        console.log(`Max retries (${maxRetries}) reached for 404 error`);
        throw new Error(
          `Product with slug "${slug}" not found after ${maxRetries} attempts`
        );
      }
    }

    // For other errors (500, network issues, etc.), you might want different retry logic
    if (err.response?.status >= 500 && currentRetry < maxRetries - 1) {
      console.log(
        `Server error (${err.response.status}), retrying after 2 seconds... (${
          currentRetry + 1
        }/${maxRetries})`
      );
      await sleep(2000); // Longer delay for server errors
      return await getSingleProduct(
        slug,
        tokenPayload,
        maxRetries,
        currentRetry + 1
      );
    }

    // If it's not a retryable error or max retries reached, throw the error
    throw err;
  }
};

const getTokenForCompany = (company_id) => {
  return new Promise((resolve, reject) => {
    sqliteInstance.all(
      `SELECT * FROM token_store WHERE company_id = ?`,
      [company_id],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const handleProductCreate = async (
  event_name,
  request_body,
  company_id,
  application_id
) => {
  try {
    // 🔍 Fetch the token from DB
    const token = await getTokenForCompany(company_id);

    if (!token || token.length === 0) {
      console.error("No token found for", company_id, application_id);
      return;
    }

    const tokenPayload = token.reduce((acc, item) => {
      acc[item.key] = item.token;
      return acc;
    }, {});

    console.log("tokenPayload", tokenPayload);

    const productId = request_body.payload.product.uid;

    const platformClient = await fdkExtension.getPlatformClient(company_id);
    console.log("platformClient", platformClient);

    // Fetch the product details using the platform client
    const product = await platformClient.catalog.getProduct({
      itemId: productId,
    });

    console.log("product", product);

    try {
      const saveProductToDB = await axios.post(
        "https://autobuzz-backend.onrender.com/api/v1/saveProduct",
        product
      );

      console.log("saveProductToDB", saveProductToDB);
    } catch (error) {
      console.error("Error saving product to DB:", error);
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
  }
};

const deleteFromDB = async (
  event_name,
  request_body,
  company_id,
  application_id
) => {
  console.log("deleteFromDB called with", {
    event_name,
    request_body,
    company_id,
    application_id,
  });

  // save json to a file
  const payload = request_body.payload;

  const { item_code } = payload.product;

  console.log("item_code", item_code);
  try {
    const res = await axios.post(
      "https://autobuzz-backend.onrender.com/api/v1/deleteProduct",
      {
        productId: item_code,
      }
    );

    console.log("Product deleted from DB:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error deleting product from DB:", error);
    return;
  }
};

const fdkExtension = setupFdk({
  api_key: process.env.EXTENSION_API_KEY,
  api_secret: process.env.EXTENSION_API_SECRET,
  base_url: process.env.EXTENSION_BASE_URL,
  cluster: process.env.FP_API_DOMAIN,
  callbacks: {
    auth: async (req) => {
      // Write you code here to return initial launch url after auth process complete
      if (req.query.application_id)
        return `${req.extension.base_url}/company/${req.query["company_id"]}/application/${req.query.application_id}`;
      else
        return `${req.extension.base_url}/company/${req.query["company_id"]}`;
    },

    uninstall: async (req) => {
      // Write your code here to cleanup data related to extension
      // If task is time taking then process it async on other process.
    },
  },
  storage: new SQLiteStorage(
    sqliteInstance,
    "exapmple-fynd-platform-extension"
  ), // add your prefix
  access_mode: "offline",
  webhook_config: {
    api_path: "/api/webhook-events",
    notification_email: "goyalhimanshu464@gmail.com",
    event_map: {
      "company/product/create": {
        version: "1",
        handler: () => console.log("product created"),
      },
      "company/product/delete": {
        handler: deleteFromDB,
        version: "1",
      },

      "company/product/create": {
        handler: handleProductCreate,
        version: "3",
      },

      // update
      "company/product/update": {
        version: "1",
        handler: () => console.log("product created"),
      },
      "company/product/update": {
        version: "2",
        handler: () => console.log("product created"),
      },
      "company/product/update": {
        version: "3",
        handler: () => console.log("product created"),
      },
    },
  },
});

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "frontend", "public", "dist")
    : path.join(process.cwd(), "frontend");

const app = express();
const platformApiRoutes = fdkExtension.platformApiRoutes;

// Middleware to parse cookies with a secret key
app.use(cookieParser("ext.session"));

// Middleware to parse JSON bodies with a size limit of 2mb
app.use(
  bodyParser.json({
    limit: "2mb",
  })
);

// Serve static files from the React dist directory
app.use(serveStatic(STATIC_PATH, { index: false }));

// FDK extension handler and API routes (extension launch routes)
app.use("/", fdkExtension.fdkHandler);

app.get("/hello", (req, res) => {
  res.send("Hello World");
});

app.get("/api/get-token", async (req, res) => {
  const { key, company_id } = req.query;
  console.log("get-token called with", { key, company_id });
  try {
    const token = await new Promise((resolve, reject) => {
      sqliteInstance.get(
        `SELECT token FROM token_store WHERE company_id = ? AND key = ?`,
        [company_id, key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.token);
        }
      );
    });

    if (!token) {
      return res
        .status(404)
        .json({ success: false, message: "Token not found" });
    }

    console.log("Token retrieved successfully", { company_id, key });

    res.json({ success: true, token });
  } catch (error) {
    console.error("Failed to retrieve token", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

app.post("/api/store-token", async (req, res) => {
  const { token, key, company_id } = req.body;

  try {
    await new Promise((resolve, reject) => {
      // First, delete any existing entries
      sqliteInstance.run(
        `DELETE FROM token_store WHERE company_id = ? AND key = ?`,
        [company_id, key],
        (deleteErr) => {
          if (deleteErr) {
            reject(deleteErr);
            return;
          }

          // Then insert the new entry
          sqliteInstance.run(
            `INSERT INTO token_store (company_id, key, token) VALUES (?, ?, ?)`,
            [company_id, key, token],
            (insertErr) => {
              if (insertErr) reject(insertErr);
              else resolve();
            }
          );
        }
      );
    });

    console.log("Token stored successfully", { company_id });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to store token", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

app.post("/api/accepted-permissions", async (req, res) => {
  const { company_id } = req.body;

  // create a new table if it doesn't exist store company_id and boolean true or false
  sqliteInstance.run(
    `CREATE TABLE IF NOT EXISTS accepted_permissions (company_id INTEGER PRIMARY KEY, accepted BOOLEAN)`,
    (err) => {
      if (err) {
        console.error("Error creating table:", err);
        return res.status(500).json({ success: false });
      }

      // Insert or update the accepted permissions
      sqliteInstance.run(
        `INSERT INTO accepted_permissions (company_id, accepted) VALUES (?, ?) ON CONFLICT(company_id) DO UPDATE SET accepted = ?`,
        [company_id, true, true],
        (err) => {
          if (err) {
            console.error("Error inserting/updating permissions:", err);
            return res.status(500).json({ success: false });
          }
          console.log("Permissions accepted for company_id:", company_id);
          return res.json({ success: true });
        }
      );
    }
  );
});

app.get("/api/check-permissions/:companyId", async (req, res) => {
  const { companyId } = req.params;

  // Query the accepted_permissions table to check if permissions are accepted
  sqliteInstance.get(
    `SELECT accepted FROM accepted_permissions WHERE company_id = ?`,
    [companyId],
    (err, row) => {
      if (err) {
        console.error("Error checking permissions:", err);
        return res.status(500).json({ success: false });
      }

      if (row) {
        return res.json({ success: true, hasPermissions: row.accepted });
      } else {
        return res.json({ success: false, accepted: false });
      }
    }
  );
});

// Route to handle webhook events and process it.
app.post("/api/webhook-events", async function (req, res) {
  try {
    console.log(`Webhook Event: ${req.body.event} received`);
    await fdkExtension.webhookRegistry.processWebhook(req);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.log(`Error Processing ${req.body.event} Webhook`);
    return res.status(500).json({ success: false });
  }
});

productRouter.get("/", async function view(req, res, next) {
  try {
    const { platformClient } = req;
    const data = await platformClient.catalog.getProducts();
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// Get single product
productRouter.get("/", async function view(req, res, next) {
  try {
    const { platformClient } = req;
    console.log("platformClient found", platformClient);
  } catch (err) {
    next(err);
  }
});

// Get products list for application
productRouter.get(
  "/application/:application_id",
  async function view(req, res, next) {
    try {
      const { platformClient } = req;
      const { application_id } = req.params;
      const data = await platformClient
        .application(application_id)
        .catalog.getAppProducts();
      return res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// FDK extension api route which has auth middleware and FDK client instance attached to it.
platformApiRoutes.use("/products", productRouter);

// If you are adding routes outside of the /api path,
// remember to also add a proxy rule for them in /frontend/vite.config.js
app.use("/api", platformApiRoutes);

// Serve the React app for all other routes
app.get("*", (req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(path.join(STATIC_PATH, "index.html")));
});

console.log("process.env.EXTENSION_API_KEY", process.env.EXTENSION_API_KEY);

module.exports = app;
