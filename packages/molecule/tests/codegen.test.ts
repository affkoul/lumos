import test from "ava";
import { codegen } from "../src/codegen";

function expectGenerated(schema: string, ...expected: string[]) {
  const generated = codegen(schema);

  return expected.every((item) => generated.includes(item));
}

test("fallback byte related generated", (t) => {
  t.true(
    expectGenerated(
      `array Byte32 [byte; 32];`,
      `export const Byte32 = createFallbackFixedBytesCodec(32);`
    )
  );

  t.true(
    expectGenerated(
      `vector Bytes <byte>;`,
      `export const Bytes = fallbackBytesCodec;`
    )
  );
});

test("array", (t) => {
  t.true(
    expectGenerated(
      `array Uint8 [byte; 1];
array RGB [Uint8; 3];`,
      `export const Uint8 = createFallbackFixedBytesCodec(1);`,
      `export const RGB = array(Uint8, 3);`
    )
  );
});

test("vector", (t) => {
  t.true(
    expectGenerated(
      `vector Bytes <byte>;
vector BytesVec <Bytes>;`,
      `export const BytesVec = vector(Bytes);`
    )
  );
});

// vector Bytes <byte>;
// option BytesOpt (Bytes);
test("option", (t) => {
  t.true(
    expectGenerated(
      `vector Bytes <byte>;
option BytesOpt (Bytes);`,
      `export const BytesOpt = option(Bytes);`
    )
  );
});

test("struct", (t) => {
  t.true(
    expectGenerated(
      `
array Byte32 [byte; 32];
array Uint32 [byte; 4];
struct OutPoint {
  tx_hash:        Byte32,
  index:          Uint32,
}
`,
      `
export const OutPoint = struct({
  tx_hash: Byte32,
  index: Uint32
}, ['tx_hash', 'index'])`
    )
  );
});

test("union", (t) => {
  const result1 = expectGenerated(
    `
array Uint8 [byte; 1];
array Uint16 [byte; 2];
union Number {
  Uint8,
  Uint16,
}
`,
    `export const Number = union({
  Uint8,
  Uint16
}, ['Uint8', 'Uint16'])`
  );

  t.true(result1);

  const result2 = expectGenerated(
    `
array Uint8 [byte; 1];
array Uint16 [byte; 2];
union Number {
  Uint8: 8,
  Uint16: 16,
}`,
    `
export const Number = union({
  Uint8,
  Uint16
}, {'Uint8': 8, 'Uint16': 16})`
  );
  t.true(result2);
});

test("table", (t) => {
  const generated = codegen(`
array Byte32 [byte; 32];
vector Bytes <byte>;
array HashType [byte; 1];

table Script {
    code_hash:      Byte32,
    hash_type:      HashType,
    args:           Bytes,
}
`);

  t.true(
    generated.includes(`export const Byte32 = createFallbackFixedBytesCodec(32);

export const Bytes = fallbackBytesCodec;

export const HashType = createFallbackFixedBytesCodec(1);

export const Script = table({
  code_hash: Byte32,
  hash_type: HashType,
  args: Bytes
}, ['code_hash', 'hash_type', 'args'])`)
  );
});

test("prepend", (t) => {
  const generated = codegen(
    `
array Uint8 [byte; 1];
array Uint16 [byte; 2];
`,
    {
      prepend: "import { Uint8 } from './customized'",
    }
  );

  t.false(generated.includes(`export const Uint8`));
  t.true(generated.includes(`export const Uint16`));
});

test("should throw when unknown type found", (t) => {
  t.throws(() => {
    codegen(`
union Something {
  Item1,
  Item2,
}
`);
  });
});
