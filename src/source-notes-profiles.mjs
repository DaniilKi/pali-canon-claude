/** One independently reviewed original-edition note. Metadata only; no duplicate note wording. */
const freeze = value => { if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };
export const SOURCE_NOTES_PROFILE = freeze({
  "schema": "vri-source-notes-v1",
  "extraction_revision": "sariputta-note1130-v1",
  "record_sha256": "0d7ab15b095a5175742655a16b67fabf31ed47f73d10fe3de1c821eb1e2b11b7",
  "registry_sha256": "1cf2b14b514180ae5fffafdf44c2c19bd4c0e5a70ee0f02f0c4585ca3fc7493e",
  "record_id": "vri:s0510m1:note-only:1130",
  "text_sha256": "e4544e7b41ad8ed3f72d281f9735359c51aac2f8c758588731a1135e4a03fa60",
  "source_commit": "2d134ff9ef60f70a1eb03c9370580228811a3070",
  "record_keys": [
    "changes",
    "extraction_revision",
    "id",
    "kind",
    "label",
    "origin",
    "physical_location",
    "provenance",
    "qualification",
    "text",
    "text_sha256"
  ],
  "max_record_characters": 8192,
  "anchors": {
    "uid": {
      "selector": {
        "uid": "tha-ap3"
      },
      "segment": {
        "ref": "tha-ap3/236",
        "type": "verse",
        "text": "",
        "vri_paragraph": "372"
      },
      "offset": 235,
      "availability": {
        "total": 1,
        "record_id": "vri:s0510m1:note-only:1130",
        "anchor_ref": "tha-ap3/236",
        "physical_location_only": true,
        "read_with": {
          "tool": "get_text",
          "uid": "tha-ap3",
          "offset": 235,
          "limit": 1,
          "source_commit": "2d134ff9ef60f70a1eb03c9370580228811a3070"
        },
        "widget_read_with": {
          "name": "read_passage_widget",
          "arguments": {
            "uid": "tha-ap3",
            "segment": "tha-ap3/236",
            "english": false,
            "source_commit": "2d134ff9ef60f70a1eb03c9370580228811a3070"
          }
        },
        "scope": "separately_indexed_original_edition_notes"
      }
    },
    "book": {
      "selector": {
        "book": "s0510m1"
      },
      "segment": {
        "ref": "vri-book:s0510m1/387",
        "type": "verse",
        "text": "",
        "vri_paragraph": "372"
      },
      "offset": 386,
      "availability": {
        "total": 1,
        "record_id": "vri:s0510m1:note-only:1130",
        "anchor_ref": "vri-book:s0510m1/387",
        "physical_location_only": true,
        "read_with": {
          "tool": "get_text",
          "book": "s0510m1",
          "offset": 386,
          "limit": 1,
          "source_commit": "2d134ff9ef60f70a1eb03c9370580228811a3070"
        },
        "widget_read_with": {
          "name": "read_passage_widget",
          "arguments": {
            "book": "s0510m1",
            "segment": "vri-book:s0510m1/387",
            "english": false,
            "source_commit": "2d134ff9ef60f70a1eb03c9370580228811a3070"
          }
        },
        "scope": "separately_indexed_original_edition_notes"
      }
    }
  }
});
