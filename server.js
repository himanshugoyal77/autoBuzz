const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
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

async function postPhotoToFacebookPage({ caption, image }) {
  const endpoint = `https://graph.facebook.com/v19.0/122095925857668/photos`;

  const payload = {
    url: image,
    caption: caption, // Title or description
    access_token:
      "EACOySOKuhEoBO9IhUx25IVxZAnu9dRsZBKLaQZAeZCvPWVXExWf4xuIIMdiZB2d0UQqrZANpJXUMk2b3yLqx6Vh2bXR74DzzWoumdyUOERixC5QZBFNVJROHjN2wjbabzem1EuxZAy464F6r0pkRgNmaoRPDRWmLCZChYSHHXJaewwIDqL8hSN6DQ1QTrZCDsHewZAJEzJt3KgZC2r38F97oeb4ZD",
  };

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

const generateContent = async (payload) => {
  try {
    const response = await axios.post(
      "https://63d48t2n-5000.inc1.devtunnels.ms/generate-ad",
      payload
    );

    console.log("response", response.data);

    const { title, description, images, poster } = await response.data.data;

    await postPhotoToFacebookPage({
      caption: title + "" + description,
      image: poster || images[0].url,
    });

    return { title, description, images, poster };
  } catch (err) {
    console.log(err);
  }
};

const getSingleProduct = async (slug) => {
  try {
    console.log("slug", slug);
    const response = await axios.get(
      `${FYND_PLATFORM_BASE_URL}/service/application/catalog/v1.0/products/${slug}/`,
      {
        headers: {
          Authorization: `Basic NjgyYzhiNWE4MTIyMDdjZDgzZjcxZWU5Onlhc0VWYVFJMg==`,
        },
      }
    );

    await generateContent(response.data);

    return response.data;
  } catch (err) {
    console.log("Error getting single product", err);
  }
};

const handleProductCreate = async (
  event_name,
  request_body,
  company_id,
  application_id
) => {


  try {
    
    const product = await getSingleProduct(request_body.payload.product.slug);

  } catch (error) {
    console.error("Error posting photo:", error);
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
        handler: () => console.log("product deleted"),
        version: "1",
      },

      "company/product/create": {
        handler: handleProductCreate,
        version: "3",
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
