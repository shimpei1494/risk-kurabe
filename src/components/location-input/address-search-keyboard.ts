interface AddressSearchKey {
  key: string;
  isComposing: boolean;
  keyCode: number;
}

/** IMEの変換確定ではなく、検索操作として押されたEnterかを判定する。 */
export function isAddressSearchEnter({ key, isComposing, keyCode }: AddressSearchKey) {
  return key === "Enter" && !isComposing && keyCode !== 229;
}
