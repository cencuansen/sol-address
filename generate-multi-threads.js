const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const { Keypair } = require('@solana/web3.js')
const bs58 = require('bs58')

// 配置参数
const config = {
    prefix: '',
    postfix: '',
    invalidChars: ['0', 'O', 'I', 'l'],
    maxAttempts: 1000000,
    threadCount: require('os').cpus().length - 2
}

if (isMainThread) {
    // 主线程代码
    console.log(`启动 ${config.threadCount} 个工作线程...`)

    let found = false
    let completedWorkers = 0

    // 创建并管理工作线程
    for (let i = 0; i < config.threadCount; i++) {
        const worker = new Worker(__filename, {
            workerData: { ...config, threadId: i }
        })

        worker.on('message', (msg) => {
            if (msg.type === 'result' && !found) {
                found = true
                console.log('\n成功找到匹配的密钥对:')
                console.log('公钥:', msg.publicKey)
                console.log('私钥:', msg.secretKey)
                console.log('分割私钥:',
                    msg.secretKey.substring(0, msg.splitStartIndex) + '|' +
                    msg.secretKey.substring(msg.splitStartIndex, msg.secretKey.length - msg.splitEndIndex) + '|' +
                    msg.secretKey.substring(msg.secretKey.length - msg.splitEndIndex))
                console.log('尝试次数:', msg.attempts)

                // 通知所有工作线程停止
                process.exit(0)
            } else if (msg.type === 'progress') {
                process.stdout.write(`\r线程 ${msg.threadId} 尝试次数: ${msg.attempts}`)
            }
        })

        worker.on('exit', () => {
            completedWorkers++
            if (completedWorkers === config.threadCount && !found) {
                console.log('\n未找到匹配的密钥对')
            }
        })
    }
} else {
    // 工作线程代码
    const { prefix, postfix, invalidChars, maxAttempts, threadId } = workerData

    // 随机分割位置
    const splitStartIndex = Math.floor(Math.random() * 6) + 5
    const splitEndIndex = Math.floor(Math.random() * 6) + 5

    // 检查前缀后缀是否有效
    if (isInvalid(prefix, postfix, invalidChars)) {
        parentPort.postMessage({
            type: 'error',
            message: `无效字符: ${invalidChars.join(',')}`
        })
        return
    }

    // 开始生成密钥对
    for (let i = 0; i < maxAttempts; i++) {
        const account = Keypair.generate()
        const publicKey = account.publicKey.toBase58()

        // 每1000次报告一次进度
        if (i % 1000 === 0) {
            parentPort.postMessage({
                type: 'progress',
                threadId,
                attempts: i
            })
        }

        // 检查前缀和后缀
        if ((prefix === '' || publicKey.startsWith(prefix)) &&
            (postfix === '' || publicKey.endsWith(postfix))) {
            const secretKey = bs58.default.encode(account.secretKey)

            parentPort.postMessage({
                type: 'result',
                publicKey,
                secretKey,
                splitStartIndex,
                splitEndIndex,
                attempts: i + 1,
                threadId
            })
            return
        }
    }

    // 完成但未找到
    parentPort.postMessage({
        type: 'complete',
        threadId,
        attempts: maxAttempts
    })
}

function isInvalid(prefix, postfix, invalidChars) {
    const _prefix = prefix || ''
    const _postfix = postfix || ''
    return invalidChars.some(ic => _prefix.includes(ic)) ||
        invalidChars.some(ic => _postfix.includes(ic))
}