---
title: "JavaScript"
date: "2026-09-01"
order: 135
hidden: true
---






# JavaScript

> **分类**：前端

> **最后修改时间**：2026-02-06 15:48:14.899

---

# JavaScript介绍
JavaScript 是一种嵌入式（embedded）语言，用来编写控制其他大型应用程序的“脚本”。
# JavaScript语句、标识符
- JavaScript 程序的单位是行（line），也就是一行一行地执行。一般情况下，每一行就是一个语句
- 语句以分号结尾，一个分号就表示一个语句结束(也可以不加分号)
- 标识符（identifier）指的是用来识别各种值的合法名称。最常见的标识符就是变量名
- 标识符是由：字母、美元符号(\$)、下划线(_)和数字组成，其中数字不能开头
# 变量
```javascript
var num = 10;

num = 20;   #变量的重新赋值
```
## 变量提升
JavaScript 引擎的工作方式是，先解析代码，获取所有被声明的变量，然后再一行一行地运行。这造成的结果，就是所有的变量的声明语句，都会被提升到代码的头部，这就叫做变量提升
```javascript
console.log(num);
var num = 10;

#相当于
var num;
console.log(num);
num = 10;

```
# JavaScript引入到文件
## 嵌入到HTML文件中
```javascript
<body>
 <script>
 var age = 20
 </script>
</body>
```
## 引入本地独立JS文件
```javascript
<body>
 <script type="text/javascript"
src="./itbaizhan.js">   </script>
</body>
```
## 引入网络来源文件
```javascript
<body>
 <script
src="https://cdn.bootcdn.net/ajax/libs/jquery
/3.6.0/jquery.min.js"> </script>
</body>
```
# JavaScript注释
```javascript
// 这是单行注释
/*
这是
多行
注释
*/

嵌入在HTML文件中的注释
<!-- 注释 -->
```
# 常见输出方式
1. 弹出窗口
2. 写在页面
3. 控制台
```javascript
/* 在浏览器中弹出一个对话框,然后把要输出的内容展示出来,
alert都是把要输出的内容首先转换为字符串然后在输出的*/
alert("要输出的内容");
document.write("要输出的内容");
// 在控制台输出内容
console.log("要输出的内容");
```
# 数据类型
JavaScript 语言的每一个值，都属于某一种数据类型。JavaScript 的数据类型，共有**六种**。（ES6 又新增了第七种 Symbol 类型的值和第八种 BigInt类型）
## 原始类型(基础类型)
- 数值
- 字符串
- 布尔值
```javascript
var age = 20;
var name = "尚学堂";
var learn = true;
```
## 合成类型(复合类型)
- 对象：
	因为一个对象往往是多个原始类型的值的合成，可以看作是一个存放各种值的容器
```javascript
var user = {
    name:"尚学堂",   //字符串
    age:20,         //数值
    learn:true      //布尔值
}
```
## undefined
## null
- null与undefined都可以表示’空’
- null一般代表对象为“没有”，undefined一般代表数值为“没有”

# 运算符
## typeof运算符
![](/uploads/20260901-7c37db.png)
## 算术运算符
### 加减乘除运算符
```javascript
10 + 10; // 20
100 - 10; // 90
10 * 2; //20
10 / 5; 2
```
### 余数运算符
```javascript
13 % 5 // 3
```
### 自增和自减运算符
```javascript
var x = 1;
var y = 1;
++x // 2
--y // 0
console.log(x++) //2
```
## 赋值运算符
![](/uploads/20260901-512a2d.png)
## 比较运算符
比较运算符用于比较两个值的大小，然后**返回一个布尔值**，表示是否满足指定的条件。
![](/uploads/20260901-78a1bd.png)
**严格比较：不光比较数值是否相等，还比较类型是否相等**
## 布尔运算符
### 取反运算符（!）
- 布尔值取反
```javascript
!true // false
!false // true
```
- 非布尔值取反
	对于非布尔值，取反运算符会将其转为布尔值。可以这样记忆，以下六个值取反后为true，其他值都为false：undefined、null、false、0、NaN、空字符串（''）
### 且运算符（&&）<br>
```javascript
console.log(10 < 20 && 10 >5); // true
```
### 或运算符（\|\|）
```javascript
console.log(10 < 20 || 10 < 5); // true
```
## 三元运算符
三元运算符可以被视为if...else...的简写形式，因此可以用于多种场合。
```javascript
(条件) ? 表达式1 : 表达式2
//条件结果为True，运行表达式1，False运行表达式2
```
# 条件语句
## if
```javascript
var m = 3;
if (m === 3) {
    m++;
}
console.log(m); // 4
```
## if...else
```javascript
if (m === 0) {
  // ...
} else if (m === 1) {
  // ...
} else if (m === 2) {
  // ...
} else {
  // ...
}

```
## switch
```javascript
switch (fruit) {
  case "banana":
    // ...
    break;
  case "apple":
    // ...
    break;
  default:
    // ...
    //需要注意的是，每个case代码块内部的break语句不能少，否则会接下去执行下一个case代码块，而不是跳出switch结构
```
# 循环语句
## for
```javascript
for (初始化表达式; 条件; 迭代因子) {
  语句
}
```
for语句后面的括号里面，有三个表达式。
1. 初始化表达式（initialize）：确定循环变量的初始值，只在循环开始时执行一次。
2. 布尔表达式（test）：每轮循环开始时，都要执行这个条件表达式，只有值为真，才继续进行循环。
3. 迭代因子（increment）：每轮循环的最后一个操作，通常用来递增循环变量。
- for语句的三个表达式，可以省略任何一个，也可以全部省略。如果三个都省略，结果就导致了一个无限循环（死循环）
九九乘法表
```javascript
for(var i = 1;i <= 9;i++){
    document.write("<br>");
    for(var j = 1;j <= i;j++){
        sum = i * j;
        document.write(i ,"*",j ,"=",sum," ");
   }
}
```
## while
```javascript
while (条件) {
  语句;
}
//无限循环
while (true) {
  console.log('Hello, world');
}

```
## break 语句和 continue 语句
break语句和continue语句都具有跳转作用，可以让代码不按既有的顺序执行
### break
break语句用于跳出代码块或循环
```javascript
or (var i = 0; i < 5; i++) {
    if (i === 3){
        break;
   }
    console.log(i);
}
```
### continue
continue语句用于立即终止本轮循环，返回循环结构的头部，开始下一轮循环
```javascript
for (var i = 0; i < 5; i++) {
    if (i === 3){
        continue;
   }
    console.log(i);
}
```
# 字符串
-  字符串就是零个或多个排在一起的字符，放在单引号或双引号之中
- 单引号字符串的内部，可以使用双引号。双引号字符串的内部，可以使用单引号
- 如果要在单引号字符串的内部，使用单引号，就必须在内部的单引号前面加上反斜杠，用来转义。双引号字符串内部使用双引号，也是如此
```javascript
'Did she say \'Hello\'?'
// "Did she say 'Hello'?"
"Did she say \"Hello\"?"
// "Did she say "Hello"?"
```
- 字符串默认只能写在一行内，分成多行将会报错
- 如果长字符串必须分成多行，可以在每一行的尾部使用反斜杠
```javascript
var longString = 'Long \
long \
string';
longString
// "Long long long string"
```
## length 属性
length属性返回字符串的长度，该属性也是无法改变的
```javascript
var s = 'itbaizhan';
s.length // 9
```
## charAt()
charAt 方法返回指定位置的字符，参数是从 0 开始编号的
```javascript
var s = new String('itbaizhan');
s.charAt(1) // "t"
s.charAt(s.length - 1) // "n"
```
- 如果参数为负数，或大于等于字符串的长度， charAt 返回空字符串
## concat()
concat 方法用于连接两个字符串，返回一个新字符串，**不改变原字符串**
```javascript
var s1 = 'itbaizhan';
var s2 = 'sxt';
s1.concat(s2) // "itbaizhansxt"
s1 // "itbaizhan"
//该方法可以接受多个参数
'sxt'.concat('itbaizhan', 'bjsxt')  //"sxtitbaizhanbjsxt"
```
- 如果参数不是字符串， concat 方法会将其先转为字符串，然后再连接
- 可以使用+连接字符串
```javascript
var result = str1 + str2 + str3;
```
## substring()
substring 方法用于从原字符串取出子字符串并返回，**不改变原字符串**。它的第一个参数表示子字符串的**开始**位置，第二个位置表示**结束**位置（返回**结果不含该位置**）
```javascript
'itbaizhan'.substring(0, 2) // "it"
//如果省略第二个参数，则表示子字符串一直到原字符串的结束
'itbaizhan'.substring(2) // "baizhan"
//如果第一个参数大于第二个参数， substring 方法会自动更换两个参数的位置
'itbaizhan'.substring(9, 2) // "baizhan"
// 等同于
'itbaizhan'.substring(2, 9) // "baizhan"
//如果参数是负数， substring 方法会自动将负数转为0
'itbaizhan'.substring(-3) // "itbaizhan"
'itbaizhan'.substring(2, -3) // "it"
```
## substr()
- substr 方法用于从原字符串取出子字符串并返回，不改变原字符串，跟 substring 方法的作用相同
- substr 方法的第一个参数是子字符串的开始位置（从0开始计算），**第二个参数是子字符串的长度**
```javascript
'itbaizhan'.substr(2, 7); // baizhan
//如果省略第二个参数，则表示子字符串一直到原字符串的结束
'itbaizhan'.substr(2) // "baizhan"
//如果第一个参数是负数，表示倒数计算的字符位置。如果第二个参数是负数，将被自动转为0，因此会返回空字符串
'itbaizhan'.substr(-7) // "baizhan"
'itbaizhan'.substr(4, -1) // ""
```
## indexOf()
indexOf 方法用于确定一个字符串在另一个字符串中第一次出现的位置，返回结果是匹配开始的位置。如果返回 -1 ，就表示不匹配
```javascript
'hello world'.indexOf('o') // 4
'itbaizhan'.indexOf('sxt') // -1
//indexOf 方法还可以接受第二个参数，表示从该位置开始向后匹配
 'hello world'.indexOf('o', 6) // 7
```
## trim()
trim 方法用于去除字符串两端的空格，返回一个新字符串，**不改变原字符串**
```javascript
' hello world '.trim()  // "hello world"
//该方法去除的不仅是空格，还包括制表符（ \t 、 \v ）、换行符（ \n ）和回车符（ \r ）
'\r\nitbaizhan \t'.trim() // 'itbaizhan'
//ES6扩展方法， trimEnd() 和 trimStart() 方法
"   itbaizhan   ".trimEnd(); //   itbaizhan
"   itbaizhan   ".trimStart(); // itbaizhan
```
## split()
split 方法按照给定规则分割字符串，返回一个由分割出来的子字符串组成的数组
```javascript
'it|sxt|baizhan'.split('|') // ["it", "sxt","baizhan"]
//如果分割规则为空字符串，则返回数组的成员是原字符串的每一个字符。
'a|b|c'.split('') // ["a", "|", "b","|","c"]
//如果省略参数，则返回数组的唯一成员就是原字符串
'it|sxt|bz'.split() // [it|sxt|bz]
//split 方法还可以接受第二个参数，限定返回数组的最大成员数。
'it|sxt|bz'.split('|', 0) // []
'it|sxt|bz'.split('|', 1) // ["it"]
'it|sxt|bz'.split('|', 2) // ["it", "sxt"]
'it|sxt|bz'.split('|', 3) // ["it", "sxt","bz"]
'it|sxt|bz'.split('|', 4) // ["it", "sxt","bz"]
```
# 数组
数组（array）是按次序排列的一组值。每个值的位置都有编号（从0开始），整个数组用方括号表示。
- 除了在定义时赋值，数组也可以先定义后赋值。
- 任何类型的数据，都可以放入数组
- 如果数组的元素还是数组，就形成了多维数组
## length 属性
数组的length属性，返回数组的成员数量
```javascript
['sxt', 'baizhan', 'it'].length // 3
```
## 数组的遍历
数组的遍历可以考虑使用for循环或while循环
```javascript
var a = ['sxt', 'baizhan', 'it'];
// for循环
for(var i = 0; i < a.length; i++) {
  console.log(a[i]);
}
// while循环
var i = 0;
while (i < a.length) {
  console.log(a[i]);
  i++;
}
```
### for...in遍历数组
```javascript
var a = ['sxt', 'baizhan', 'it'];
for (var i in a) {
  console.log(a[i]);
}
```
## Array.isArray()
Array.isArray 方法返回一个布尔值，表示参数**是否为数组**。它可以弥补,typeof 运算符的不足
```javascript
var arr = ["尚学堂", 100, true];
console.log(typeof arr); // object

var arr = ['sxt', 'baizhan', 'it'];
Array.isArray(arr) // true
```
## push()/pop()
push 方法用于在数组的末端添加一个或多个元素，并返回添加新元素后的数组长度。注意，该方法**会改变原数组**
```javascript
var arr = [];
arr.push("尚学堂") // 1
arr.push('itbaizhan') // 2
arr.push(true, {}) // 4
arr // [尚学堂, 'itbaizhan', true, {}]
```
pop 方法用于删除数组的最后一个元素，并返回该元素。注意，该方法**会改变原数组**
```javascript
var arr = ['尚学堂'
, 'itbaizhan', 'WEB前端'];
arr.pop() // 'WEB前端'
arr // ['尚学堂', 'itbaizhan']
```
## shift()/unshift()
**shift **方法用于删除数组的第一个元素，并返回该元素。注意，该方法会改变原数组
```javascript
var arr = ['尚学堂', 'itbaizhan', 'WEB前端'];
arr.shift() // '尚学堂'
arr // ['itbaizhan', 'WEB前端']
```
shift 方法可以遍历并清空一个数组
```javascript
var list = [1, 2, 3, 4, 5, 6];
var item;
while (item = list.shift()) {
  console.log(item);
}
list // []
```
unshift 方法用于在数组的第一个位置添加元素，并返回添加新元素后的数组长度。注意，该方法会改变原数组
```javascript
var arr = ['尚学堂', 'itbaizhan', 'WEB前端'];
arr.unshift('baizhan'); // 4
arr // ['baizhan', '尚学堂', 'itbaizhan', 'WEB
前端']
//unshift 方法可以接受多个参数，这些参数都会添加到目标数组头部
var arr = [ '尚学堂', 'itbaizhan' ];
arr.unshift('WEB前端', 'baizhan') // 4
arr // [ 'WEB前端', 'baizhan', '尚学堂','itbaizhan' ]
```
## join()
**join **方法以指定参数作为分隔符，将所有数组成员**连接为一个字符串返回**。如果不提供参数，默认用逗号分隔
```javascript
var a = [1, 2, 3, 4];
a.join(' ') // '1 2 3 4'
a.join(' | ') // "1 | 2 | 3 | 4"
a.join() // "1,2,3,4"
```
如果数组成员是 undefined 或 null 或空位，会被转成空字符串
```javascript
[undefined, null].join('#')
// '#'
['a',, 'b'].join('-')
// 'a--b'
```
数组的 join 配合字符串的 split 可以实现**数组与字符串的互换**
```javascript
var arr = ["a","b","c"];
var myArr = arr.join("");
console.log(myArr);
console.log(myArr.split(""));
```
## concat()
**concat **方法用于多个数组的合并。它将新数组的成员，添加到原数组成员的后部，然后返回一个新数组，**原数组不变**
```javascript
['hello'].concat(['world'])
// ["hello", "world"]
['hello'].concat(['world'], ['!'])
// ["hello", "world", "!"]
```
除了数组作为参数， concat 也接受其他类型的值作为参数，添加到目标数组尾部。
```javascript
[1, 2, 3].concat(4, 5, 6)
// [1, 2, 3, 4, 5, 6]
```
**应用场景**：上拉加载，合并数据
# reverse()
reverse 方法用于颠倒排列数组元素，返回改变后的数组。注意，该方法将**改变原数组**
```javascript
var a = ['a', 'b', 'c'];
a.reverse() // ["c", "b", "a"]
a // ["c", "b", "a"]
```
实现一个字符串反转排列
```javascript
var str = "hello";
str.split("").reverse().join("")
```
## indexOf()
indexOf 方法返回给定元素在数组中第一次出现的位置，如果没有出现则返回 -1
```javascript
var arr = ['a', 'b', 'c'];
arr.indexOf('b') // 1
arr.indexOf('y') // -1
//indexOf 方法还可以接受第二个参数，表示搜索的开始位置
['尚学堂','百战程序员','itbaizhan'].indexOf('尚学堂', 1) // -1
```
# 函数
## 函数的声明
function 命令： function命令声明的代码区块，就是一个函数。<br>function命令后面是函数名，函数名后面是一对圆括号，里面是传入函数的参数。函数体放在大括号里面。
```javascript
function 函数名(参数) {
  函数体;
}

function print(s) {
  console.log(s);
}
//调用
print();
```
## 函数名的提升
JavaScript 引擎将函数名视同变量名，所以采用function命令声明函数时，整个函数会像变量声明一样，被提升到代码头部
## 函数参数
函数运行的时候，有时需要提供外部数据，不同的外部数据会得到不同的结果，这种外部数据就叫参数
```javascript
function square(x) {
 console.log(x * x);
}
square(2) // 4
square(3) // 9
```
## 函数返回值
JavaScript函数提供两个接口实现与外界的交互，其中参数作为入口，接收外界信息；返回值作为出口，把运算结果反馈给外界
```javascript
function getName(name){
    return name;
}
var myName = getName("itbaizhan")
console.log(myName); // itbaizhan
```
return 后面不能在添加任何代码，因为不会执行
# 对象
对象（object）就是一组“键值对”（key-value）的集合，是一种无序的复合数据集合
```javascript
var user = {
  name: 'itbaizhan',
  age: '13'
};
```
对象的每一个键名又称为“**属性**”（property），它的“键值”可以是任何数据类型。如果一个属性的值为函数，通常把这个属性称为“**方法**”，它可以像函数那样调用
**对象.属性（对象.函数）**
```javascript
var 对象={
	函数名: function (参数) {
		函数体
 }
}
对象.函数名(实参)

var user = {
  getName: function (name) {
    return name;
 }
};
user.getName("itbaizhan") // itbaizhan
```
如果属性的值还是一个对象，就形成了链式引用
## Math对象
Math是 JavaScript 的原生对象，提供各种数学功能。
### Math.abs()
**Math.abs **方法返回参数值的绝对值
```javascript
Math.abs(1) // 1
Math.abs(-1) // 1
```
### Math.max()，Math.min()
**Math.max **方法返回参数之中最大的那个值， **Math.min** 返回最小的那个值。
如果参数为空, Math.min 返回 Infinity , Math.max 返回 -Infinity 。
```javascript
Math.max(2, -1, 5) // 5
Math.min(2, -1, 5) // -1
Math.min() // Infinity
Math.max() // -Infinity
```
### Math.floor()，Math.ceil()
**Math.floor** 方法返回小于参数值的最大整数
**Math.ceil **方法返回大于参数值的最小整数
```javascript
Math.floor(3.2) // 3
Math.floor(-3.2) // -4
Math.ceil(3.2) // 4
Math.ceil(-3.2) // -3
```
### Math.random()
Math.random() 返回0到1之间的一个伪随机数，可能等于0，但是一定小于1
```javascript
 Math.random() // 0.28525367438365223
 //任意范围的随机数生成函数如下
 function getRandomArbitrary(min, max) {
	  return Math.random() * (max - min) + min;
}
getRandomArbitrary(5, 10)
```
## Date对象
Date 对象是 JavaScript 原生的时间库。它以1970年1月1日00:00:00作为时间的零点，可以表示的时间范围是前后各1亿天（单位为毫秒）
### Date.now()
Date.now 方法返回当前时间距离时间零点（1970年1月1日 00:00:00UTC）的毫秒数，相当于 Unix 时间戳乘以1000
```javascript
 Date.now();   // 1635216733395
```
**时间戳**是指格林威治时间1970年01月01日00时00分00秒(北京时间1970年01月01日08时00分00秒)起至现在的总秒数。
Date 对象提供了一系列 get\* 方法，用来获取实例对象某个方面的值
![](/uploads/20260901-206292.png)
```javascript
var d = new Date('January 6, 2022');
```
编写函数获得本年度剩余天数
```javascript
function leftDays() {
  var today = new Date();
  var endYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
  var msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endYear.getTime() -
today.getTime()) / msPerDay);
}
```
# DOM
- DOM 是 JavaScript 操作网页的接口，全称为“文档对象模型”（Document Object Model）。它的作用是将网页转为一个JavaScript 对象，从而可以用脚本进行各种操作（比如对元素增删内容）
- 浏览器会根据 DOM 模型，将结构化文档HTML解析成一系列的节点，再由这些节点组成一个树状结构（DOM Tree）。所有的节点和最终的树状结构，都有规范的对外接口
- DOM 只是一个接口规范，可以用各种语言实现。所以严格地说，DOM 不是 JavaScript 语法的一部分，但是 DOM 操作是 JavaScript最常见的任务，离开了 DOM，JavaScript 就无法控制网页。另一方面，JavaScript 也是最常用于 DOM 操作的语言
### 节点
DOM 的最小组成单位叫做节点（node）。文档的树形结构（DOM树），就是由各种不同类型的节点组成。每个节点可以看作是文档树的一片叶子
- 节点的类型有七种
![](/uploads/20260901-d13c0e.png)
### 节点树
一个文档的所有节点，按照所在的层级，可以抽象成一种树状结构。这种树状结构就是 DOM 树。它有一个顶层节点，下一层都是顶层节点的子节点，然后子节点又有自己的子节点，就这样层层衍生出一个金字塔结构，倒过来就像一棵树
浏览器原生提供document节点，代表整个文档
### 层级关系
![](/uploads/20260901-1d22d6.png)
### Node.nodeType属性
不同节点的nodeType属性值和对应的常量如下
![](/uploads/20260901-fd7630.png)
# document对象_方法/获取元素
## document.getElementsByTagName()
document.getElementsByTagName 方法**搜索** HTML** 标签名**，返回符合条件的元素。它的**返回**值是一个类似**数组**对象（ **HTMLCollection** 实例），可以实时反映 HTML 文档的变化。如果没有任何匹配的元素，就返回一个空集
```javascript
var paras =document.getElementsByTagName('p')[0];
var paras =document.getElementsByTagName('p')[1];
var paras =document.getElementsByTagName('p')[3];
```
如果传入 \* ，就可以返回文档中所有 HTML 元素
```javascript
var allElements =document.getElementsByTagName('*');
```
## document.getElementsByClassName()
document.getElementsByClassName 方法返回一个类似数组的对象（ HTMLCollection 实例），包括了所有 **class 名字符合指定条件**的元素，元素的变化实时反映在返回结果中
```javascript
var elements =document.getElementsByClassName(names);
//参数可以是多个 class ，它们之间使用空格分隔
var elements =document.getElementsByClassName('foo bar');
```
- 由于 class 是保留字，所以 JavaScript 一律使用 className 表示 CSS 的class
## document.getElementsByName()
document.getElementsByName 方法用于选择拥有 name 属性的 HTML 元素（比如form、radio 、img  等），返回一个类似数组的的对象（ NodeList 实例），因为 name 属性相同的元素可能不止一个
```javascript
// 表单为 <form name="itbaizhan"></form>
var forms =document.getElementsByName('itbaizhan');
```
## document.getElementById()
document.getElementById 方法返回匹配指定 **id 属性**的元素节点。如果没有发现匹配的节点，则返回 null
```javascript
var elem = document.getElementById('para1');
```
注意，该方法的参数是大小写敏感的。比如，如果某个节点的 id 属性是 main ，那么 document.getElementById('Main') 将返回 null
## document.querySelector()
document.querySelector 方法接受一个 **CSS 选择器**作为参数，返回匹配该选择器的元素节点。如果有多个节点满足匹配条件，则返回**第一个匹配的节点**。如果没有发现匹配的节点，则返回 null
```javascript
var el1 = document.querySelector('.myclass');
```
## document.querySelectorAll()
document.querySelectorAll 方法与 querySelector 用法类似，区别是返回一个NodeList 对象，包含**所有匹配给定选择器的节点**
```javascript
var elementList =document.querySelectorAll('.myclass');
```
# document对象_方法/创建元素
## document.createElement()
document.createTextNode 方法用来生成文本节点（ Text 实例），并返回该节点。它的参数是文本节点的内容
```javascript
var newDiv = document.createElement('div');
```
## document.createTextNode()
document.createTextNode 方法用来生成文本节点（ Text 实例），并返回该节点。它的参数是文本节点的内容
```javascript
var newDiv = document.createElement('div');
var newContent =document.createTextNode('Hello');
newDiv.appendChild(newContent);
```
## document.createAttribute()<br>
document.createAttribute 方法生成一个新的属性节点（ Attr 实例），并返回它
```javascript
var text = document.createElement("p");
var content = document.createTextNode('我是文本')
var id =document.createAttribute('id')
id.value='root'
text.appendChild(content)
text.setAttributeNode(id)
console.log(text);
var container=document.getElementById("container")
container.appendChild(text)
```
# Element对象_属性
Element对象对应网页的 HTML 元素。每一个 HTML 元素，在DOM 树上都会转化成一个Element节点对象（以下简称元素节点）
## [Element.id](http://element.id/)
[Element.id](http://element.id/) 属性返回指定元素的 id 属性，该属性可读写
```javascript
// HTML 代码为 <p id="foo">
var p = document.querySelector('p');
p.id ='foo'// "foo"
```
## Element.className
className 属性用来读写当前元素节点的 class 属性。它的值是一个字符串，每个 class 之间用空格分割
```javascript
// HTML 代码 <div class="one two three"
id="myDiv"></div>
var div = document.getElementById('myDiv');
div.className='boxs'
```
## Element.classList
classList 对象有下列方法
- add() ：增加一个 class。
- remove() ：移除一个 class。
- contains() ：检查当前元素是否包含某个 class。
- toggle() ：将某个 class 移入或移出当前元素
```javascript
var div = document.getElementById('myDiv');
div.classList.add('myCssClass');
div.classList.add('foo', 'bar');
div.classList.remove('myCssClass');
div.classList.toggle('myCssClass'); // 如果
myCssClass 不存在就加入，否则移除
div.classList.contains('myCssClass'); // 返回
true 或者 false
```
## Element.innerHTML
Element.innerHTML 属性返回一个字符串，等同于该元素包含的所有HTML 代码。该属性可读写，常用来设置某个节点的内容。它能改写所有元素节点的内容，包括 \<HTML\> 和 \<body\> 元素
```javascript
el.innerHTML       //读取
el.innerHTML = 'hello'; //设置
```
## Element.innerText
innerText 和 innerHTML 类似，不同的是 innerText 无法识别元素，会直接渲染成字符串
# Element获取元素位置
![](/uploads/20260901-f022b4.png)
![](/uploads/20260901-ebf2c3.png)
## Element.clientHeight，Element.clientWidth
![](/uploads/20260901-e1232f.png)
## Element.scrollHeight，Element.scrollWidth
![](/uploads/20260901-62e671.png)
## Element.scrollLeft，Element.scrollTop<br>
![](/uploads/20260901-c6b4bd.png)
## Element.offsetHeight，Element.offsetWidth
![](/uploads/20260901-aedc6a.png)
## Element.offsetLeft，Element.offsetTop
![](/uploads/20260901-fc5941.png)
# CSS操作
## HTML 元素的 style 属性
操作 CSS 样式最简单的方法，就是使用网页元素节点的 setAttribute 方法直接操作网页元素的 style 属性
```javascript
iv.setAttribute(
  'style',
  'background-color:red;' + 'border:1px solid
black;'
);
```
## 元素节点的 style 属性
```javascript
var divStyle =
document.querySelector('div').style;
divStyle.backgroundColor = 'red';
divStyle.border = '1px solid black';
divStyle.width = '100px';
divStyle.height = '100px';
divStyle.fontSize = '10em';
```
## cssText 属性
```javascript
var divStyle =
document.querySelector('div').style;
divStyle.cssText = 'background-color: red;'
  + 'border: 1px solid black;'
  + 'height: 100px;'
  + 'width: 100px;';
```
# 事件处理程序
事件处理程序分为：
1. HTML事件处理
2. DOM0级事件处理
3. DOM2级事件处理
## HTML事件
```javascript
<!DOCTYPE html>
<html>
    <head lang="en">
    <meta charset="UTF-8">
        <title>Js事件详解--事件处理</title>
    </head>
    <body>
        <div id="div">
            <button id="btn1"
onclick="demo()">按钮</button>
        </div>
        <script>
            function demo(){
                alert("hello html事件处理");
           }
        </script>
    </body>
</html>
```
## DOM0级事件处理
```javascript
<body>
    <div id="div">
        <button id="btn1">按钮</button>
    </div>
    <script>
        var
btn1=document.getElementById("btn1");
        btn1.onclick=function(){alert("HelloDOM0级事件处理程序1");}//被覆盖掉
        btn1.onclick=function(){alert("HelloDOM0级事件处理程序2");}
    </script>
</body>
```
## DOM2级事件处理
```javascript
<body>
    <div id="div">
        <button id="btn1">按钮</button>
    </div>
    <script>
        var
btn1=document.getElementById("btn1");

btn1.addEventListener("click",demo1);

btn1.addEventListener("click",demo2);

btn1.addEventListener("click",demo3);
        function demo1(){
            alert("DOM2级事件处理程序1")
       }
        function demo2(){
            alert("DOM2级事件处理程序2")
       }
        function demo3(){
            alert("DOM2级事件处理程序3")
       }

btn1.removeEventListener("click",demo2);
    </script>
</body>
```
# 鼠标事件
鼠标事件指与鼠标相关的事件，具体的事件主要有以下一些
![](/uploads/20260901-d93432.png)
- 这些方法在使用的时候，除了DOM2级事件，都需要添加前缀on
```javascript
var btn1 = document.getElementById("btn1");
btn1.onclick = function(){
    console.log("click事件");
}
```
# Event事件对象
事件发生以后，会产生一个事件对象，作为参数传给监听函数。
## Event对象属性
- Event.Target
- Event.type
### Event.target
Event.target属性返回事件当前所在的节点
```javascript
// HTML代码为
// <p id="para">Hello</p>
function setColor(e) {
  console.log(this === e.target);
  e.target.style.color = 'red';
}
para.addEventListener('click', setColor);
```
### Event.type
Event.type属性返回一个字符串，表示事件类型。事件的类型是在生成事件的时候。该属性只读
## Event对象方法
### Event.preventDefault
Event.preventDefault方法取消浏览器对当前事件的默认行为。比如点击链接后，浏览器默认会跳转到另一个页面，使用这个方法以后，就不会跳转了
```javascript
btn.onclick = function(e){
    e.preventDefault(); // 阻止默认事件
    console.log("点击A标签");
}
```
### Event.stopPropagation()
stopPropagation方法阻止事件在 DOM 中继续传播，防止再触发定义在别的节点上的监听函数，但是不包括在当前节点上其他的事件监听函数
```javascript
btn.onclick = function(e){
    e.stopPropagation(); // 阻止事件冒泡
    console.log("btn");
}
```
# 键盘事件
键盘事件由用户击打键盘触发，主要有keydown、keypress、keyup三个事件
- keydown：按下键盘时触发。
- keypress：按下有值的键时触发，即按下 Ctrl、Alt、Shift、Meta 这样无值的键，这个事件不会触发。对于有值的键，按下时先触发keydown事件，再触发这个事件。
- keyup：松开键盘时触发该事件
```javascript
username.onkeypress = function(e){
    console.log("keypress事件");
```
## event对象
keyCode:唯一标识
```javascript
var username = document.getElementById("username");
username.onkeydown = function(e){
    if(e.keyCode === 13){
        console.log("回车");
   }
}

```
# 表单事件
表单事件是在使用表单元素及输入框元素可以监听的一系列事件
- input事件
- select事件
- Change事件
- reset事件
- submit事件
## input事件
input事件当input、select、textarea 的值发生变化时触发。对于复选框（ \<input type=checkbox\> ）或单选框（ \<input type=radio\> ），用户改变选项时，也会触发这个事件<br>input事件的一个特点，就是会连续触发，比如用户每按下一次按<br>键，就会触发一次input事件。
```javascript
var username =
document.getElementById("username");
username.oninput = function(e){
    console.log(e.target.value);
}
```
## select事件
<br>select事件当在input 、textarea 里面选中文本时触发
```javascript
// HTML 代码如下
// <input id="test" type="text" value="Select
me!" />
var elem = document.getElementById('test');
elem.addEventListener('select', function (e)
{
  console.log(e.type); // "select"
}, false);
```
## Change 事件
Change事件当input、select、 textarea的值发生变化时触发。它与input事件的最大不同，就是不会连续触发，只有当全部修改完成时才会触发
```javascript
var email = document.getElementById("email");
email.onchange = function(e){
    console.log(e.target.value);
}
```
## reset 事件，submit 事件
这两个事件发生在表单对象 form 上，而不是发生在表单的成员上。reset事件当表单重置（所有表单成员变回默认值）时触发。submit事件当表单数据向服务器提交时触发。注意，submit事件的发生对象是  form 元素，而不是 button  元素，因为提交的是表单，而不是按钮
```javascript
<form id="myForm" onsubmit="submitHandle">
    <button onclick="resetHandle">重置数据
</button>
    <button>提交</button>
</form>

var myForm =
document.getElementById("myForm")
function resetHandle(){
    myForm.reset();
}
function submitHandle(){
    console.log("提交");
}
```
# 事件代理(事件委托)
由于事件会在冒泡阶段向上传播到父节点，因此可以把子节点的监听函数定义在父节点上，由父节点的监听函数统一处理多个子元素的事件。这种方法叫做事件的代理（delegation）
```javascript
var ul = document.querySelector('ul');
ul.addEventListener('click', function (event)
{
  if (event.target.tagName.toLowerCase() ===
'li') {
    // some code
 }
});
```
# 定时器
JavaScript 提供定时执行代码的功能，叫做定时器（timer），主要由 setTimeout() 和 setInterval() 这两个函数来完成。它们向任务队列添加定
## setTimeout()
setTimeout 函数用来指定某个函数或某段代码，在多少毫秒之后执行。它返回一个整数，表示定时器的编号，以后可以用来取消这个定时器
```javascript
var timerId = setTimeout(func|code, delay);
```
setTimeout 函数接受两个参数，第一个参数 func\|code 是将要推迟执行的函数名或者一段代码，第二个参数 delay 是推迟执行的毫秒数
```javascript
tTimeout(function(){
    console.log("定时器")
},1000)
```
- 还有一个需要注意的地方，如果回调函数是对象的方法，那么setTimeout 使得方法内部的 this 关键字指向全局环境，而不是定义时所在的那个对象
```javascript
var name = "sxt";
var user = {
    name: "itbaizhan",
    getName: function () {
        setTimeout(function(){
            console.log(this.name);
       },1000)
   }
};
user.getName();
//解决方案
var name = "sxt";
var user = {
    name: "itbaizhan",
    getName: function () {
        var that = this;
        setTimeout(function(){
            console.log(that.name);
       },1000)
   }
};
user.getName();
//定时器可以进行取消
var id = setTimeout(f, 1000);
clearTimeout(id);
```
##  setInterval()
setInterval 函数的用法与 setTimeout 完全一致，区别仅仅在于 setInterval 指定某个任务每隔一段时间就执行一次，也就是无限次的定时执行
```javascript
<!DOCTYPE html>
<html lang="en">
<head>
 <meta charset="UTF-8">
 <meta name="viewport"
content="width=device-width, initialscale=1.0">
 <title>Document</title>
 <style>
 #someDiv{
 width: 100px;
 height: 100px;
 background: red;
  }
 </style>
</head>
<body>
 <div id="someDiv"></div>
 <script>
 var div =
document.getElementById('someDiv');
 var opacity = 1;
 var fader = setInterval(function() {
  opacity -= 0.05;
  if (opacity > 0) {
    div.style.opacity = opacity;
 } else {
    clearInterval(fader);
 }
 }, 30);
 </script>
</body>
</html>
```
- 定时器可以进行取消
```javascript
var id = setInterval(f, 1000);
clearInterval(id);
```
# 防抖
防抖严格算起来应该属于性能优化的知识，但实际上遇到的频率相当高，处理不当或者放任不管就容易引起浏览器卡死。

效果：如果短时间内大量触发同一事件，只会执行一次函数
```javascript
function debounce(fn,delay){
    let timer = null //借助闭包
    return function() {
        if(timer){
            clearTimeout(timer)
       }
        timer = setTimeout(fn,delay) // 简化
写法
   }
}
// 然后是旧代码
function showTop () {
    var scrollTop =
document.documentElement.scrollTop;
    console.log('滚动条位置：' + scrollTop);
}
window.onscroll = debounce(showTop,300)
```
**防抖定义**<br>对于短时间内连续触发的事件（上面的滚动事件），防抖的含义就是让某个时间期限（如上面的1000毫秒）内，事件处理函数只执行一次
# 节流
节流严格算起来应该属于性能优化的知识，但实际上遇到的频率相当高，处理不当或者放任不管就容易引起浏览器卡死
