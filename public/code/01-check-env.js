/**
 * l1 · 环境验证脚本
 * ─────────────────────────────────────────────────────────
 * 这是学习路上第一个 Node 程序：检查电脑上的开发环境是否就绪。
 * 运行方式：node 01-check-env.js
 *
 * 读码要点（对应第 01 节文档）：
 *   1. require/解构   —— 从 Node 内置模块里取出 execSync 的写法
 *   2. execSync       —— 同步执行一条系统命令，返回命令的输出
 *   3. try/catch      —— 命令不存在时会抛异常，用 try/catch 兜住
 *   4. 模板字符串      —— `文字 ${变量}` 的拼接写法
 */

// 从 Node 内置模块里"解构"出要用的函数（不用 npm install，Node 自带）
const { execSync } = require('child_process');

/**
 * 执行一条系统命令，成功返回输出文本，失败返回 null
 * @param {string} cmd - 要执行的命令，如 "node -v"
 * @returns {string | null}
 */
function run(cmd) {
  try {
    // execSync 返回的是 Buffer（原始字节）， toString('utf8') 转成文字
    // trim() 去掉首尾的换行和空格
    return execSync(cmd).toString('utf8').trim();
  } catch (err) {
    // 走到这里说明命令不存在或执行失败（比如没装 Git）
    return null;
  }
}

// 结果用 ✓ / ✗ 标记，好一眼看出哪项没过
const OK = '✓';
const BAD = '✗';

console.log('========== 开发环境检查 ==========');

// ① 检查 Node.js 版本
const nodeVer = run('node -v');
if (nodeVer) {
  // nodeVer 形如 "v24.18.1"，slice(1) 去掉 v，split('.') 拆成 ["24","18","1"]
  const major = Number(nodeVer.slice(1).split('.')[0]);
  const isLTSLevel = major >= 24;
  console.log(
    `${isLTSLevel ? OK : BAD} Node.js  ${nodeVer}  （要求 ≥ 24，LTS）`
  );
} else {
  console.log(`${BAD} Node.js 未安装或不在 PATH 中`);
}

// ② 检查 npm
const npmVer = run('npm -v');
console.log(npmVer ? `${OK} npm      ${npmVer}` : `${BAD} npm 未安装`);

// ③ 检查 npm 镜像源（国内加速）
const registry = run('npm config get registry');
if (registry && registry.includes('npmmirror')) {
  console.log(`${OK} npm 镜像源  ${registry}`);
} else {
  console.log(`${BAD} npm 镜像源未配置（建议执行下面这条命令后重测）：`);
  console.log('   npm config set registry https://registry.npmmirror.com');
}

// ④ 检查 Git（第 02 节的主角，没装也没关系）
const gitVer = run('git --version');
console.log(gitVer ? `${OK} Git      ${gitVer}` : `${BAD} Git 未安装（第 02 节装）`);

console.log('==================================');
console.log('全部 ✓ 则环境就绪，可以继续下一节。');
