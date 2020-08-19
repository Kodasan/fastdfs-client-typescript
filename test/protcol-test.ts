import { numberToBuff, buffToNumber } from "../src/protocol";

test('NumberTransform', () => {
    let num = 0xABCD12
    let buffer = Buffer.alloc(8)
    let targetBuffer = Buffer.alloc(8)
    targetBuffer[7] = 0x12
    targetBuffer[6] = 0xCD
    targetBuffer[5] = 0xAB
    numberToBuff(num, buffer, 0)
    expect(buffer).toStrictEqual(targetBuffer)
})

test('BufferToNumber', () => {
    let num = 0xABCD12
    let buffer = Buffer.alloc(8)
    numberToBuff(num, buffer, 0)
    expect(buffToNumber(buffer, 0)).toBe(num)
})