import React from 'react';
import { validateFileType } from '../utils/validation';
import { ValidationError } from '../utils/errors';
import { FILE_CONFIG } from '../constants';

const FileUpload = ({ onFileSelect, loading }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    
    try {
      validateFileType(file, FILE_CONFIG.ALLOWED_TYPES);
      onFileSelect(file);
    } catch (error) {
      if (error instanceof ValidationError) {
        alert(error.message);
      } else {
        alert('Please select a valid PDF file');
      }
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-area">
        <div className="upload-icon">📄</div>
        <h2>Upload Credit Card Statement (PDF)</h2>
        <p className="upload-description">
          Upload your DBS/POSB credit card statement to calculate your carbon footprint
        </p>
        
        <input
          type="file"
          id="pdf-upload"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={loading}
          className="file-input"
        />
        <label htmlFor="pdf-upload" className={`upload-button ${loading ? 'disabled' : ''}`}>
          {loading ? 'Processing...' : 'Choose PDF File'}
        </label>
        
        <div className="privacy-notice-box">
          <div className="privacy-icon">🔒</div>
          <div className="privacy-text">
            <strong>Privacy Protected:</strong> All processing happens in your browser. 
            No data is uploaded to any server.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;