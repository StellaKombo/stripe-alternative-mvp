import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { api } from "../api/apiClient";

export default function MerchantOnboard({ navigation }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [merchantId, setMerchantId] = useState("");

  const handleSubmit = async () => {
    const data = { name, business_type: type, country, website };
    const res = await api.postMerchant(data);
    setMerchantId(res.id);
    navigation.navigate("DocumentUpload", { merchantId: res.id });
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Merchant Onboarding</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} />
      <TextInput placeholder="Business Type" value={type} onChangeText={setType} />
      <TextInput placeholder="Country (ISO2)" value={country} onChangeText={setCountry} />
      <TextInput placeholder="Website" value={website} onChangeText={setWebsite} />
      <Button title="Submit" onPress={handleSubmit} />
      {merchantId ? <Text>Merchant ID: {merchantId}</Text> : null}
    </View>
  );
}
