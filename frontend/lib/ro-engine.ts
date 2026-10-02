interface RoTelemetryInput {
  feedPressure: number;
  permeateFlowRaw: number;
  temperatureCelsius: number;
  pH: number;
  tdsMgL: number;
  calciumHardnessMgL: number;
  alkalinityMgL: number;
}

export class RoEngineeringEngine {
  public static calculateTCF(tempC: number): number {
    if (tempC >= 25) {
      return Math.exp(0.02 * (tempC - 25));
    } else {
      return Math.exp(0.03 * (tempC - 25));
    }
  }

  public static getTemperatureNormalizedFlow(rawFlow: number, tempC: number): number {
    const tcf = this.calculateTCF(tempC);
    if (tcf === 0) return rawFlow;
    return rawFlow / tcf;
  }

  public static calculateLSI(input: RoTelemetryInput): number {
    // Safety: avoid log(0) crash
    if (input.tdsMgL <= 0 || input.calciumHardnessMgL <= 0 || input.alkalinityMgL <= 0) {
      return 0;
    }
    const T = input.temperatureCelsius + 273.15;
    const logT = Math.log10(T);
    
    const A = (Math.log10(input.tdsMgL) - 1) / 10;
    const B = -13.12 * logT + 34.55;
    const C = Math.log10(input.calciumHardnessMgL) - 0.4;
    const D = Math.log10(input.alkalinityMgL);

    const pHs = (9.3 + A + B) - (C + D);
    return input.pH - pHs;
  }

  public static getLsiRisk(lsi: number): string {
    if (lsi < -0.5) return "CORROSIVE";
    if (lsi < 0.5) return "BALANCED - Safe";
    if (lsi < 1.0) return "MILD SCALING RISK";
    return "HIGH SCALING - Dose Antiscalant!";
  }
}
export function getAIDiagnosticPrompt(telemetry: any) {
  return `DIAGNOSTIC LAW CHECK:
  LSI=${telemetry.lsi}, DP1=${telemetry.dp1}, DP2=${telemetry.dp2}, Rej=${telemetry.salt_rej}%
  Apply Scaling vs Biofouling Matrix before output.`
}