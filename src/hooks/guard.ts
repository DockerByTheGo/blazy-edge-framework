export function guard<TGuardReturn>(schema: TGuardReturn): (prev) => TGuardReturn {
  return (prev) => {
    if (prev.contains(schema)) {
      return schema;
    }
    throw new Error("Guard failed");
  };
}

export function TotalGuard<TSchemaa>(schema: TSchemaa): (prev) => TSchemaa {
  return (prev) => {
    if (prev.deepEquals(schema)) {
      return schema;
    }
    throw new Error("TotalGuard failed");
  };
}
