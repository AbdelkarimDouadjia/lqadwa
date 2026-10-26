# Prescription OCR and assistant — separate readiness

## Prescription module: DISABLED / NOT READY FOR HANDWRITING

`PRESCRIPTION_AI_ENABLED` defaults OFF and is effective only in CORE mode. It controls the scan entry in updated web/Android clients. There is no external OCR upload endpoint, cloud-AI processing, prescription training collection or new model purchase. Older clients' local OCR cannot be remotely removed, but their submitted free-text medicine names remain unverified on the server.

The browser module preserves original transcription separately from editable review text. Low overall recognition scores retain an uncertainty warning; candidate matching never auto-selects a strength/form. Image handling permits JPEG/PNG/WebP, caps input at 8 MB and decoded images at 20 megapixels, reduces the working edge to 2,200 pixels, bounds text at 15,000 characters and processing at 120 seconds, terminates workers on cancellation and clears local state when closed/unmounted. The decoded-pixel check occurs after browser decoding; hostile image-decoder hardening requires the independent security review listed in the backlog.

Reproducible checks:

```sh
npm run test:ai-safety
npm run test:ocr
```

`tests/ocr/benchmark.json` is a five-case synthetic candidate-safety corpus with provenance. It contains no patient prescriptions. `test:ocr` runs the actual installed Tesseract engine and Arabic/French/English language workers on a generated printed Latin document, reports character/word edit-distance error rates, and checks two brand candidates. This is not an Algerian handwriting benchmark or a clinical accuracy claim. It does not justify enabling production handwriting recognition.

Verified available implementations: the project installs Tesseract.js 7 and the native app bundles ML Kit text recognition 16.0.1 for Latin script. The [Tesseract FAQ](https://tesseract-ocr.github.io/tessdoc/FAQ.html) and [Google's Android integration guide](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) are primary references. Tesseract was executed on the printed synthetic fixture. ML Kit compiled; physical-device OCR was not executed here. No other handwriting model was evaluated or represented as suitable.

Before handwriting activation: obtain authorized, deidentified, licensed representative Algerian Arabic/French handwriting samples; independently double-label medication identity/strength/form and uncertain spans; split by writer/patient/source before evaluation; record model/weights/preprocessing versions and licenses. Report CER/WER, exact medicine/strength/form identification, top-k recall, unresolved rate, unsafe-selection rate, latency and device memory. Include illegible, contradictory, multi-line, confusable and out-of-catalog cases. Set acceptance thresholds with pharmacists. Do not train an LLM from scratch or assume a public dataset permits commercial training. No suitable licensed handwriting corpus or clinical acceptance was supplied in this session.

## Assistant: DISABLED / READ-ONLY FOUNDATION

`GROUNDED_ASSISTANT_ENABLED` separately defaults OFF. The implemented endpoint accepts a strict allow-list of structured read-only tools: catalog lookup, the current account's request status, and a finite help-topic registry with supporting links. Request IDs are checked with a server-owned owner predicate. No client-supplied account ID, SQL, arbitrary URL, tool name or write operation is accepted. Pickup codes, other patients' information and full prescription text are not returned. Catalog answers explicitly report stock as unconfirmed.

The current implementation is a deterministic, zero-LLM-cost fallback. It has bounded JSON input/output, ten requests per minute per account, authenticated access, origin checks, private no-store responses and no model/provider network call. It does not diagnose, prescribe, change a dose or authorize substitution. The synthetic tests cover tool injection, extra owner fields, unsupported tools and input limits; authenticated integration tests cover cross-account denial and hidden pickup codes.

There is no general-purpose LLM chat or vector retrieval/training pipeline enabled. The finite help registry is the initial retrieval scope; operator approval/localization and a versioned official-document ingestion/evaluation process remain necessary before expanding it. Any future model adapter needs explicit provider/data-transfer acceptance, deadlines, spend caps, source citations, adversarial evaluation and a deterministic fallback. Experimental AI readiness is independent of the core release decision.
