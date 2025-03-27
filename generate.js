const { Keypair } = require('@solana/web3.js')
const bs58 = require('bs58')

const prefix = ''
const postfix = ''
const invalidChars = ['0', 'O', 'I', 'l']
const splitStartIndex = Math.floor(Math.random() * 6) + 5
const splitEndIndex = Math.floor(Math.random() * 6) + 5

for (let i = 0; i < 100000; i++) {
    if (isInvalid(prefix, postfix)) {
        console.log('invalid chars: ' + invalidChars)
        break
    }

    const account = Keypair.generate()
    const publicKey = account.publicKey.toBase58()

    if (!publicKey.startsWith(prefix) || !publicKey.endsWith(postfix)) {
        continue
    }

    const secretKey = bs58.default.encode(account.secretKey)

    console.log('try  times: ' + (i + 1))
    console.log('public key: ' + publicKey)
    console.log('secret key: ' + secretKey)
    console.log('split  key: '
        + secretKey.substring(0, splitStartIndex) + '|'
        + secretKey.substring(splitStartIndex, secretKey.length - splitEndIndex) + '|'
        + secretKey.substring(secretKey.length - splitEndIndex))

    break
}

function isInvalid(prefix, postfix) {
    const _prefix = prefix || ''
    const _postfix = postfix || ''
    const invalidPrefix = invalidChars.some(ic => _prefix.includes(ic))
    const invalidPostfix = invalidChars.some(ic => _postfix.includes(ic))
    return invalidPrefix || invalidPostfix
}