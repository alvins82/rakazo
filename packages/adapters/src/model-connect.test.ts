import { afterEach, describe, expect, it, vi } from "vitest";
import { buildModelConnectPlaintext, modelCredentialDto } from "./model-connect.js";
import { parseModelSecret, serializeModelSecret } from "./pi-oauth.js";

describe("modelCredentialDto", () => {
  it("returns stored baseUrl and modelId for openai-compatible credentials", () => {
    const plaintext = serializeModelSecret({
      kind: "openai_compatible",
      baseUrl: "https://example.invalid/v1",
    });
    expect(
      modelCredentialDto(
        {
          id: "cred-1",
          provider: "openai-compatible",
          label: "Local MLX",
          isDefault: true,
          defaultModel: "qwen3-4b",
        },
        plaintext,
      ),
    ).toEqual({
      id: "cred-1",
      provider: "openai-compatible",
      label: "Local MLX",
      hasKey: true,
      isDefault: true,
      supportsImages: false,
      baseUrl: "https://example.invalid/v1",
      modelId: "qwen3-4b",
      reasoning: false,
      thinkingLevels: ["off"],
    });
  });

  it("projects image support for the selected model only", () => {
    const plaintext = serializeModelSecret({
      kind: "openai_compatible",
      baseUrl: "https://example.invalid/v1",
      visionModelIds: ["vision-model", "another-vision-model"],
    });
    const row = {
      id: "cred-vision",
      provider: "openai-compatible",
      label: "Vision server",
      isDefault: true,
      supportsImages: false,
    };

    expect(modelCredentialDto({ ...row, defaultModel: "vision-model" }, plaintext)).toMatchObject({
      supportsImages: true,
      modelId: "vision-model",
    });
    expect(modelCredentialDto({ ...row, defaultModel: "text-model" }, plaintext)).toMatchObject({
      supportsImages: false,
      modelId: "text-model",
    });
  });

  it("exposes defaultModel as modelId for provider credentials", () => {
    expect(
      modelCredentialDto({
        id: "cred-2",
        provider: "xai",
        label: "xAI",
        isDefault: false,
        defaultModel: "grok-4.6",
      }),
    ).toEqual({
      id: "cred-2",
      provider: "xai",
      label: "xAI",
      hasKey: true,
      isDefault: false,
      modelId: "grok-4.6",
    });
  });
});

it.each([true, false])(
  "persists generic reasoning capability %s with the connection",
  (reasoning) => {
    const plaintext = buildModelConnectPlaintext({
      provider: "openai-compatible",
      baseUrl: "http://localhost:8000/v1",
      modelId: "arbitrary-model",
      reasoning,
    });
    expect(parseModelSecret(plaintext)).toEqual({
      kind: "openai_compatible",
      baseUrl: "http://localhost:8000/v1",
      reasoning,
    });
    expect(
      modelCredentialDto(
        {
          id: "cred",
          provider: "openai-compatible",
          label: "Server",
          isDefault: true,
          defaultModel: "arbitrary-model",
        },
        plaintext,
      ),
    ).toMatchObject({
      reasoning,
      thinkingLevels: reasoning ? ["off", "minimal", "low", "medium", "high"] : ["off"],
    });
  },
);

describe("compatible connection updates", () => {
  const input = {
    provider: "openai-compatible",
    modelId: "arbitrary-model",
    baseUrl: "http://localhost:8000/v1",
    reasoning: true,
  };
  const previous = serializeModelSecret({
    kind: "openai_compatible",
    baseUrl: input.baseUrl,
    apiKey: "fake-saved-key",
  });
  afterEach(() => vi.unstubAllEnvs());

  it("preserves a saved key on a capability-only update to the same normalized URL", () => {
    expect(
      parseModelSecret(
        buildModelConnectPlaintext({ ...input, baseUrl: "http://localhost:8000" }, previous),
      ),
    ).toMatchObject({ apiKey: "fake-saved-key", reasoning: true });
  });
  it("does not transfer a saved key to a different endpoint", () => {
    expect(
      parseModelSecret(
        buildModelConnectPlaintext({ ...input, baseUrl: "http://localhost:8001/v1" }, previous),
      ),
    ).not.toHaveProperty("apiKey");
  });

  it("keeps image capability scoped to each explicitly enabled model", () => {
    const vision = buildModelConnectPlaintext({ ...input, supportsImages: true });
    const text = buildModelConnectPlaintext(
      { ...input, modelId: "text-model", supportsImages: false },
      vision,
    );
    const nextVision = buildModelConnectPlaintext(
      { ...input, modelId: "another-vision-model", supportsImages: true },
      text,
    );

    expect(parseModelSecret(text)).toMatchObject({
      visionModelIds: ["arbitrary-model"],
    });
    expect(parseModelSecret(nextVision)).toMatchObject({
      visionModelIds: ["arbitrary-model", "another-vision-model"],
    });
  });
  it.each(["", "fake-replacement-key"])(
    "honors an explicit key replacement or removal",
    (apiKey) => {
      const saved = parseModelSecret(buildModelConnectPlaintext({ ...input, apiKey }, previous));
      if (apiKey) expect(saved).toHaveProperty("apiKey", apiKey);
      else expect(saved).not.toHaveProperty("apiKey");
    },
  );
  it("revalidates inherited keys against the public-HTTPS policy", () => {
    vi.stubEnv("RAKAZO_OPENAI_COMPAT_ALLOW_PUBLIC", "1");
    const baseUrl = "http://example.invalid/v1";
    const legacy = serializeModelSecret({ kind: "openai_compatible", baseUrl, apiKey: "fake-key" });
    expect(() => buildModelConnectPlaintext({ ...input, baseUrl }, legacy)).toThrow(/HTTPS/);
  });
});
