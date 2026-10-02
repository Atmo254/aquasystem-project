import requests

class RoEngineeringEngine:

    def calculate_lsi(self, ph, tds, temp_c, ca_hardness, alkalinity):
        # Your existing LSI formula
        A = (9.3 + 0) # placeholder for your A,B,C,D logic
        B = 0
        C = 0
        D = 0
        pHs = (9.3 + A + B) - (C + D)
        return ph - pHs

    def check_system_health(self, dp_media, tenant="AquaPure Industrial", asset="RO-UNIT-02B"):
        # THIS IS WHERE YOUR ALERT CODE GOES - INSIDE A FUNCTION
        print(f"Checking DP: {dp_media} bar")
        
        if dp_media > 1.0:
            print(f"🚨 ALERT TRIGGERED: {dp_media} bar > 1.0")
            try:
                # call Node API that runs sendCriticalAlert
                requests.post("http://localhost:3001/api/alert", json={
                    "tenant": tenant,
                    "asset": asset,
                    "tag": "Media Filter ΔP",
                    "value": dp_media,
                    "limit": 1.0
                }, timeout=5)
            except Exception as e:
                print(f"Alert failed (Node not running yet, that's ok): {e}")
        
        return dp_media > 1.0

# Test it
if __name__ == "__main__":
    engine = RoEngineeringEngine()
    engine.check_system_health(dp_media=1.15)