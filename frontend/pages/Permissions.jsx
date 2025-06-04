import React, { useState } from "react";
import "./style/AutoBuzzInstall.css";
import logo from "../public/assets/logo.png"; // Adjust the path as necessary
import ReactFlowUI from "./Test"; // Assuming this is the component you want to render after permissions are accepted
import FacebookTokenPage from "./FacebookTokenPage";

const AutoBuzzInstaller = () => {
  const [isAcceptedPermissions, setIsAcceptedPermissions] = useState(() => {
    const savedPermissions = localStorage.getItem(
      "acceptedPermissionsforAutoBuzz"
    );
    return savedPermissions ? JSON.parse(savedPermissions) : false;
  });

  const handleAcceptPermissions = () => {
    setIsAcceptedPermissions(true);
    localStorage.setItem(
      "acceptedPermissionsforAutoBuzz",
      JSON.stringify(true)
    );
  };

  return (
    <div className="">
      {!isAcceptedPermissions && (
        <div className="installer-container">
          <div className="installer-box">
            <h2>
              You are about to install <strong>AutoBuzz</strong>
            </h2>
            <div className="">
              <img src={logo} alt="AutoBuzz Logo" className="logo" />
            </div>
          </div>

          <div className="permissions-box">
            <h3>Permissions</h3>
            <p className="info-text">
              The extension will have access to the following resources. Please
              accept to grant these permissions.
            </p>
            <div className="permission-section">
              <strong>Facebook</strong>
              <p>
                Allows you to manage your Facebook page, including posting
                updates and posting contenet
              </p>
            </div>
            <hr />
            <div className="permission-section">
              <strong>Catalog</strong>
              <p>
                Allows you to manage your product catalog by creating, updating,
                and deleting products.
              </p>
            </div>
          </div>

          <p className="terms">
            By proceeding, you are agreeing to the AutoBuzz{" "}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>

          <div className="buttons">
            <button className="cancel">Cancel</button>
            <button className="accept" onClick={handleAcceptPermissions}>
              Accept and Continue
            </button>
          </div>
        </div>
      )}

      {isAcceptedPermissions && <FacebookTokenPage />}
    </div>
  );
};

export default AutoBuzzInstaller;
