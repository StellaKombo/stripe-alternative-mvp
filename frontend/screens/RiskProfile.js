import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { api } from "../api/apiClient";

export default function RiskProfile({ route }) {
  const { merchantId } = route.params;
  const [risk, setRisk] = useState(null);

  useEffect(() => {
    const fetchRisk = async () => {
      const res = await api.getRiskProfile(merchantId);
      setRisk(res);
    };
    fetchRisk();
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text>Merchant Risk Profile</Text>
      {risk ? (
        <>
          <Text>Score: {risk.score}</Text>
          <Text>Tier: {risk.tier}</Text>
          <Text>Reserve %: {risk.reserve_pct}</Text>
        </>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
}
