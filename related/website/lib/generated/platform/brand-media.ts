// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
import type {MediaSlot,ContentField} from './content';
/** Additive slots: old releases remain valid; replacements still require controlled assets. */
export const brandMediaDefaults: Record<string,MediaSlot> = {
  "asset_dc26b27fe3117728": {
    "assetId": null,
    "url": "/assets/orb-ui-20261102/cook.webp",
    "alt": "LumiqOrb cook",
    "kind": "image",
    "profile": "asset_dc26b27fe3117728"
  },
  "asset_f7e2ba338d31371b": {
    "assetId": null,
    "url": "/assets/orb-ui-20261102/recipe.webp",
    "alt": "LumiqOrb recipe",
    "kind": "image",
    "profile": "asset_f7e2ba338d31371b"
  },
  "asset_9ccabb9a31b94ad2": {
    "assetId": null,
    "url": "/assets/orb-ui-20261102/calendar.webp",
    "alt": "LumiqOrb calendar",
    "kind": "image",
    "profile": "asset_9ccabb9a31b94ad2"
  },
  "asset_a9189b139b2ce05e": {
    "assetId": null,
    "url": "/assets/orb-ui-20261102/tasks.webp",
    "alt": "LumiqOrb tasks",
    "kind": "image",
    "profile": "asset_a9189b139b2ce05e"
  },
  "asset_3dbef3e285441f46": {
    "assetId": null,
    "url": "/assets/orb-ui-20261102/rewards.webp",
    "alt": "LumiqOrb rewards",
    "kind": "image",
    "profile": "asset_3dbef3e285441f46"
  },
  "asset_dd25b70a62c78f12": {
    "assetId": null,
    "url": "/assets/orb-ui-20261102/gallery.webp",
    "alt": "LumiqOrb gallery",
    "kind": "image",
    "profile": "asset_dd25b70a62c78f12"
  },
  "asset_1cda2c90e6c65f98": {
    "assetId": null,
    "url": "/assets/ola-scenes-20261103/adult-senior-companion.webp",
    "alt": "成人与长辈一起使用 LumiqOla",
    "kind": "image",
    "profile": "asset_1cda2c90e6c65f98"
  }
};
export const brandMediaFields: readonly (ContentField & {optionalGroup:string})[] = [
  {
    "path": "media.asset_dc26b27fe3117728",
    "pages": [
      "/products/nest"
    ],
    "type": "object",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dc26b27fe3117728"
  },
  {
    "path": "media.asset_dc26b27fe3117728.assetId",
    "pages": [
      "/products/nest"
    ],
    "type": "assetId",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dc26b27fe3117728"
  },
  {
    "path": "media.asset_dc26b27fe3117728.url",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dc26b27fe3117728",
    "initialValue": "/assets/orb-ui-20261102/cook.webp"
  },
  {
    "path": "media.asset_dc26b27fe3117728.alt",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dc26b27fe3117728",
    "initialValue": "LumiqOrb cook"
  },
  {
    "path": "media.asset_dc26b27fe3117728.kind",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dc26b27fe3117728",
    "fixedValue": "image"
  },
  {
    "path": "media.asset_dc26b27fe3117728.profile",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dc26b27fe3117728",
    "fixedValue": "asset_dc26b27fe3117728"
  },
  {
    "path": "media.asset_f7e2ba338d31371b",
    "pages": [
      "/products/nest"
    ],
    "type": "object",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_f7e2ba338d31371b"
  },
  {
    "path": "media.asset_f7e2ba338d31371b.assetId",
    "pages": [
      "/products/nest"
    ],
    "type": "assetId",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_f7e2ba338d31371b"
  },
  {
    "path": "media.asset_f7e2ba338d31371b.url",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_f7e2ba338d31371b",
    "initialValue": "/assets/orb-ui-20261102/recipe.webp"
  },
  {
    "path": "media.asset_f7e2ba338d31371b.alt",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_f7e2ba338d31371b",
    "initialValue": "LumiqOrb recipe"
  },
  {
    "path": "media.asset_f7e2ba338d31371b.kind",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_f7e2ba338d31371b",
    "fixedValue": "image"
  },
  {
    "path": "media.asset_f7e2ba338d31371b.profile",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_f7e2ba338d31371b",
    "fixedValue": "asset_f7e2ba338d31371b"
  },
  {
    "path": "media.asset_9ccabb9a31b94ad2",
    "pages": [
      "/products/nest"
    ],
    "type": "object",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_9ccabb9a31b94ad2"
  },
  {
    "path": "media.asset_9ccabb9a31b94ad2.assetId",
    "pages": [
      "/products/nest"
    ],
    "type": "assetId",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_9ccabb9a31b94ad2"
  },
  {
    "path": "media.asset_9ccabb9a31b94ad2.url",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_9ccabb9a31b94ad2",
    "initialValue": "/assets/orb-ui-20261102/calendar.webp"
  },
  {
    "path": "media.asset_9ccabb9a31b94ad2.alt",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_9ccabb9a31b94ad2",
    "initialValue": "LumiqOrb calendar"
  },
  {
    "path": "media.asset_9ccabb9a31b94ad2.kind",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_9ccabb9a31b94ad2",
    "fixedValue": "image"
  },
  {
    "path": "media.asset_9ccabb9a31b94ad2.profile",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_9ccabb9a31b94ad2",
    "fixedValue": "asset_9ccabb9a31b94ad2"
  },
  {
    "path": "media.asset_a9189b139b2ce05e",
    "pages": [
      "/products/nest"
    ],
    "type": "object",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_a9189b139b2ce05e"
  },
  {
    "path": "media.asset_a9189b139b2ce05e.assetId",
    "pages": [
      "/products/nest"
    ],
    "type": "assetId",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_a9189b139b2ce05e"
  },
  {
    "path": "media.asset_a9189b139b2ce05e.url",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_a9189b139b2ce05e",
    "initialValue": "/assets/orb-ui-20261102/tasks.webp"
  },
  {
    "path": "media.asset_a9189b139b2ce05e.alt",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_a9189b139b2ce05e",
    "initialValue": "LumiqOrb tasks"
  },
  {
    "path": "media.asset_a9189b139b2ce05e.kind",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_a9189b139b2ce05e",
    "fixedValue": "image"
  },
  {
    "path": "media.asset_a9189b139b2ce05e.profile",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_a9189b139b2ce05e",
    "fixedValue": "asset_a9189b139b2ce05e"
  },
  {
    "path": "media.asset_3dbef3e285441f46",
    "pages": [
      "/products/nest"
    ],
    "type": "object",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_3dbef3e285441f46"
  },
  {
    "path": "media.asset_3dbef3e285441f46.assetId",
    "pages": [
      "/products/nest"
    ],
    "type": "assetId",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_3dbef3e285441f46"
  },
  {
    "path": "media.asset_3dbef3e285441f46.url",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_3dbef3e285441f46",
    "initialValue": "/assets/orb-ui-20261102/rewards.webp"
  },
  {
    "path": "media.asset_3dbef3e285441f46.alt",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_3dbef3e285441f46",
    "initialValue": "LumiqOrb rewards"
  },
  {
    "path": "media.asset_3dbef3e285441f46.kind",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_3dbef3e285441f46",
    "fixedValue": "image"
  },
  {
    "path": "media.asset_3dbef3e285441f46.profile",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_3dbef3e285441f46",
    "fixedValue": "asset_3dbef3e285441f46"
  },
  {
    "path": "media.asset_dd25b70a62c78f12",
    "pages": [
      "/products/nest"
    ],
    "type": "object",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dd25b70a62c78f12"
  },
  {
    "path": "media.asset_dd25b70a62c78f12.assetId",
    "pages": [
      "/products/nest"
    ],
    "type": "assetId",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dd25b70a62c78f12"
  },
  {
    "path": "media.asset_dd25b70a62c78f12.url",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dd25b70a62c78f12",
    "initialValue": "/assets/orb-ui-20261102/gallery.webp"
  },
  {
    "path": "media.asset_dd25b70a62c78f12.alt",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dd25b70a62c78f12",
    "initialValue": "LumiqOrb gallery"
  },
  {
    "path": "media.asset_dd25b70a62c78f12.kind",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dd25b70a62c78f12",
    "fixedValue": "image"
  },
  {
    "path": "media.asset_dd25b70a62c78f12.profile",
    "pages": [
      "/products/nest"
    ],
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "optionalGroup": "media.asset_dd25b70a62c78f12",
    "fixedValue": "asset_dd25b70a62c78f12"
  },
  {
    "type": "object",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "path": "media.asset_1cda2c90e6c65f98",
    "pages": [
      "/products/ola"
    ],
    "optionalGroup": "media.asset_1cda2c90e6c65f98"
  },
  {
    "type": "assetId",
    "maxLength": null,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "path": "media.asset_1cda2c90e6c65f98.assetId",
    "pages": [
      "/products/ola"
    ],
    "optionalGroup": "media.asset_1cda2c90e6c65f98"
  },
  {
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "path": "media.asset_1cda2c90e6c65f98.url",
    "pages": [
      "/products/ola"
    ],
    "optionalGroup": "media.asset_1cda2c90e6c65f98",
    "initialValue": "/assets/ola-scenes-20261103/adult-senior-companion.webp"
  },
  {
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": true,
    "owner": "snapshot",
    "path": "media.asset_1cda2c90e6c65f98.alt",
    "pages": [
      "/products/ola"
    ],
    "optionalGroup": "media.asset_1cda2c90e6c65f98",
    "initialValue": "成人与长辈一起使用 LumiqOla"
  },
  {
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "path": "media.asset_1cda2c90e6c65f98.kind",
    "pages": [
      "/products/ola"
    ],
    "optionalGroup": "media.asset_1cda2c90e6c65f98",
    "fixedValue": "image"
  },
  {
    "type": "string",
    "maxLength": 2000,
    "icuSignature": null,
    "mediaPurpose": "image",
    "adminOnly": false,
    "editable": false,
    "owner": "snapshot",
    "path": "media.asset_1cda2c90e6c65f98.profile",
    "pages": [
      "/products/ola"
    ],
    "optionalGroup": "media.asset_1cda2c90e6c65f98",
    "fixedValue": "asset_1cda2c90e6c65f98"
  }
];
