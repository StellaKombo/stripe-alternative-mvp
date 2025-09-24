import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../api/apiClient";

export default function DocumentUpload({ route, navigation }) {
  const { merchantId } = route.params;
  const [docType, setDocType] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.type === "success") {
      const storagePath = result.uri; // in real app, upload to Supabase storage bucket
      const res = await api.postDocument(merchantId, { doc_type: docType, storage_path: storagePath });
      setUploadStatus(res.id ? "Uploaded!" : "Failed");
    }
  };

  const viewRisk = () => navigation.navigate("RiskProfile", { merchantId });

  return (
    <View style={{ padding: 20 }}>
      <Text>Upload Merchant Documents</Text>
      <TextInput placeholder="Document Type" value={docType} onChangeText={setDocType} />
      <Button title="Pick & Upload Document" onPress={pickDocument} />
      <Text>{uploadStatus}</Text>
      <Button title="View Risk Profile" onPress={viewRisk} />
    </View>
  );
}
