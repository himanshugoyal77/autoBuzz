import React, { useState } from "react";
import Step1FetchProduct from "./Step1FetchProduct";
import Step2OtherDetails from "./Step2OtherDetails";
import "./style/MultiStepForm.css";
import { useParams } from "react-router-dom";
import Step3FbUpload from "./Step3FbUpload";

const MultiStepForm = ({ companyId }) => {
  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { company_id } = useParams();

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  console.log("selectedProduct", selectedProduct);

  return (
    <div className="multi-step-form">
      {step === 1 && (
        <Step1FetchProduct
          companyId={companyId || company_id}
          onNext={nextStep}
          onProductSelect={setSelectedProduct}
        />
      )}
      {step === 2 && (
        <Step2OtherDetails
          product={selectedProduct}
          onBack={prevStep}
          onNext={nextStep}
          companyId={companyId || company_id}
          setTitle={setTitle}
          setDescription={setDescription}
          setImage={setImage}
          title={title}
          description={description}
        />
      )}
      {step === 3 && <Step3FbUpload 
        product={selectedProduct}
        onBack={prevStep}
        onNext={nextStep}
        companyId={companyId || company_id}
        image={image}
        title={title}
        description={description}
        reset={()=>{
          setStep(1);
          setSelectedProduct(null);
          setImage(null);
          setTitle("");
          setDescription("");
        }}
      />}
    </div>
  );
};

export default MultiStepForm;
