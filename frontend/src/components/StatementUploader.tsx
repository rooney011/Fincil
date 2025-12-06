"use client";
import { useState } from "react";

export default function StatementUploader({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    setUploading(true);
    setMessage("Processing with AI... (This takes ~10s)");

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage(`Success! Imported ${data.inserted} transactions.`);
        // Optional: Trigger a refresh of the transaction list here
      } else {
        setMessage("Error parsing file.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Connection failed. Is the Python backend running?");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 border-2 border-dashed border-gray-700 rounded-xl bg-gray-900 text-center">
      <h3 className="text-xl font-bold text-white mb-2">Import Bank Statement</h3>
      <p className="text-gray-400 mb-4 text-sm">Upload PDF or CSV to auto-fill your history</p>
      
      <div className="relative inline-block">
        <input
          type="file"
          accept=".pdf,.csv"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer px-6 py-3 rounded-lg font-bold transition ${
            uploading 
              ? "bg-gray-600 cursor-wait" 
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {uploading ? "Analyzing..." : "Select File"}
        </label>
      </div>

      {message && (
        <div className={`mt-4 text-sm ${message.includes("Success") ? "text-green-400" : "text-yellow-400"}`}>
          {message}
        </div>
      )}
    </div>
  );
}