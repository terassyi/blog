---
category: network
tags:
 - xdp
 - ebpf
 - cilium
 - golang
date: 2021-10-18
title: XDP入門
description: XDPに入門します
---

こんにちは．閃光のハサウェイが配信開始されたので早速視聴しました．メッサーがいいですね．

前回もXDP関連の話題でしたが，今回はXDPに入門します．
XDPを学習する際のロードマップやつまりどころの解消になればと思います．

## XDP
XDPとはeXpress Data Pathの略でLinuxカーネル内で動作するeBPFベースの高性能なパケット処理技術です．
制限のあるC言語で記述したプログラムをBPFバイトコードにコンパイルし，NICにアタッチすることでカーネルのプロトコルスタックより手前でパケット処理を行うことができます．
XDPには以下のようなメリットがあります．
- カーネルを修正することなく柔軟にパケット処理機能を実装することができる
- 特別なハードウェアを準備することなく利用することができる
- 高速にパケットをしょりすることができる
- 既存のTCP/IPスタックを置き換えることなく協調して動作させることができる

## ユースケース
XDPのユースケースとして以下のようなものがあります．
- DDos攻撃の軽減
	- [Cloudflare Gatebot](https://blog.cloudflare.com/l4drop-xdp-ebpf-based-ddos-mitigations/)
- L4ロードバランサ
	- [Facebook Katran](https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/)
	- [LINE](https://speakerdeck.com/line_devday2019/software-engineering-that-supports-line-original-lbaas)
- NAT
	- [XFLAG](https://speakerdeck.com/mabuchin/zhuan-binagaramonetutowakuchu-li-wo-sohutoueadezi-zuo-siteikuhua)
- Packet filtering
	- [Cilium](https://cilium.io/)
- Router

## アーキテクチャ(仕組み)
XDPプログラムはC言語として記述し，BPFバイトコードにコンパイルします．
また，BPF Verifierによりメモリアクセスやループなどを静的に検査してNICにロードします．

プログラムがアタッチされるとパケットの着信の度にNICのデバイスドライバ内でフックされてプログラムが実行されます．
そのため`sk_buff`が生成されるより前の段階でパケットを編集することができます．
![xdp-packet-processing](/img/xdp-packet-processing.png)

### XDP Actions
XDPプログラムはそのXDP Actions(終了コード)によってパケットを制御します．
サポートされているXDP Actionsは以下です．
- XDP_PASS
	- パケットをOSのプロトコルスタックに流す.
- XDP_DROP
	- パケットをドロップする.
- XDP_TX
	- パケットを受信したNICから送出する．
- XDP_ABORTED
	- BPFのエラーを返す際に使用する．パケットはドロップする．
- XDP_REDIRECT
	- 受信したパケットを`DEVMAP`に登録されたNICから送出する．

### BPF Map
BPFプログラムはカーネル内にロードされます．BPFプログラム(カーネル空間)とユーザー空間でデータをやり取りする手段としてBPFマップがあります．

![Linux-kernel-eBPF-architecture](/img/Linux-kernel-eBPF-architecture.png)

BPFマップは任意の型のKey-Value連想配列です．bpfシステムコールによって作成，値の追加，削除，参照などが行われます．

### BPF Map Type
BPFマップはその用途に対して25種類のタイプが存在します．
ユーザーは自身の用途に合わせたマップを使用することができます．
各タイプは以下のようになっています．
- BPF_MAP_TYPE_UNSPEC
- **BPF_MAP_TYPE_HASH**
	- 単純なハッシュ．
- **BPF_MAP_TYPE_ARRAY**
	- 単純な配列．要素の削除はできない
- **BPF_MAP_TYPE_PROG_ARRAY**
	- `tail_call`(詳しくは前エントリ([Goのcilium/ebpfでXdpcapを使う](https://terassyi.net/posts/2021/10/07/use-xdpcap.html#%E6%89%8B%E6%B3%95)))のジャンプテーブルとして使用される配列
- **BPF_MAP_TYPE_PERF_EVENT_ARRAY**
	- `bpf_perf_event_output()`の結果が保持される．ユーザースペースのプログラムはそれをpoll()してあげる．
- **BPF_MAP_TYPE_PERCPU_HASH**
	- CPUごとに割り当てられるハッシュ．
- **BPF_MAP_TYPE_PERCPU_ARRAY**
	- CPUごとに割り当てられた配列．
- BPF_MAP_TYPE_STACK_TRACE
- BPF_MAP_TYPE_CGROUP_ARRAY
- **BPF_MAP_TYPE_LRU_HASH**
	- LRUハッシュ
- **BPF_MAP_TYPE_LRU_PERCPU_HASH**
	- CPUごとのLRUハッシュ
- ***BPF_MAP_TYPE_LPM_TRIE***
	- longest-prefixマッチをサポートしたマップ．ルートテーブルなどを作る際に使用する．
- BPF_MAP_TYPE_ARRAY_OF_MAPS
- BPF_MAP_TYPE_HASH_OF_MAPS
- ***BPF_MAP_TYPE_DEVMAP***
	- `bpf_redirect()`に使用する．NIC間のリダイレクト用．
- BPF_MAP_TYPE_SOCKMAP
- BPF_MAP_TYPE_CPUMAP
- BPF_MAP_TYPE_XSKMAP
- BPF_MAP_TYPE_SOCKHASH
- BPF_MAP_TYPE_CGROUP_STORAGE
- BPF_MAP_TYPE_REUSEPORT_SOCKARRAY
- BPF_MAP_TYPE_PERCPU_CGROUP_STORAGE
- BPF_MAP_TYPE_QUEUE
- BPF_MAP_TYPE_STACK
- BPF_MAP_TYPE_SK_STORAGE

たくさんあります．
しかし，BPF(XDP)を使う際によく使うマップはそんなに種類はなく**太字**にしているものくらいだと思います．また，**斜体太字**にしているマップはXDPでよく使うマップではないかと思います．

- [BPF In Depth: Communicating with Userspace](https://blogs.oracle.com/linux/post/bpf-in-depth-communicating-with-userspace)
- [bpf(2) - Linux manual page - man7.org](https://man7.org/linux/man-pages/man2/bpf.2.html)

### ヘルパー関数
BPFマップの作成や参照，更新は[bpfシステムコール](https://man7.org/linux/man-pages/man2/bpf.2.html)を呼び出すことで行われます．
定義は以下です．
```c
int bpf(int cmd, union bpf_attr *attr, unsigned int size);
```
`linux/bpf.h`をインクルードすると使えるとのことですが，通常の環境では定義がありません．
そのためbpfシステムコールを直で使うのは結構大変です．

そこで，BPFマップの扱いを簡潔にする[ヘルパー関数](https://man7.org/linux/man-pages/man7/bpf-helpers.7.html)が用意されています．
マップの操作に限らず様々なヘルパー関数が定義されています．
ここでは頻繁に使用する関数のみ見ていきます．他の関数が気になる方は[man page](https://man7.org/linux/man-pages/man7/bpf-helpers.7.html)をのぞいてみてください．

#### マップ関連
- `void *bpf_map_lookup_elem(struct bpf_map *map, const void *key)`
	- keyに対応するvalueを探す
	- 値のポインタがNULL
- ` long bpf_map_update_elem(struct bpf_map *map, const void *key, const void *value, u64 flags)`
	- keyに対応するvalueの値を更新する
	- flagsに渡す値によって値がすでに存在している場合の挙動などを指定する
	- `flags = 0`で新規に値を追加できる
- `long bpf_map_delete_elem(struct bpf_map *map, const void *key)`
	- keyに対応するエントリを削除する

#### デバッグ
- `long bpf_trace_printk(const char *fmt, u32 fmt_size, ...)`
	- デバッグのためにメッセージを出力する
	- `/sys/kernel/debug/tracing/trace_pipe`に出力されるので`cat`などで読む

#### XDPで使う
- `long bpf_fib_lookup(void *ctx, struct bpf_fib_lookup *params, int plen, u32 flags)`
	- FIB(Forwarding Information Base)(ルートテーブル)を参照することができる
	- [bpf_fib_lookup](https://elixir.bootlin.com/linux/latest/source/include/uapi/linux/bpf.h#L5947)という構造体を通してルートテーブルを参照して結果を得る
- `long bpf_xdp_adjust_head(struct xdp_buff *xdp_md, int delta)`
	- `xdp_md->data`で得られるパケットの先頭をずらすことができる
	- encap/decapに使用する

## Generic XDP
前項までで述べたようにXDPはNICのデバイスドライバレベルでパケットを処理します．
つまり，XDPが有効なNICでなければ使用することができません．
しかし，このような制限があると気軽にXDPを試すことができません．
そこでLinux Kernelには`Generic XDP`という機能がサポートされています．
この`Generic XDP`はXDPの強みである高速さを犠牲にして`sk_buff`の生成後にXDPプログラムを実行することができるようにしています．
そのため，NICのサポートの有無を気にすることなくXDPを試すことができます．

入門段階ではほぼすべてのケースで`Generic XDP`を使用することとなるため以降のサンプルでは`Generic XDP`を使用します．

`Generic XDP`の話題は[こちら](https://yunazuno.hatenablog.com/entry/2017/06/12/094101#f-609aae5d)の記事が詳しいので背景など気になる方はご覧ください．

## 実験環境
本記事での実験環境は以下のようになっています．
- AWS EC2 instance t3.large
- kernel version
	- 5.11.0-1019-aws
- architecture
	- x86_64
- NIC
	- Elastic Network Adaptor(ENA)
- os
	- Ubuntu 20.04.3 LTS
- clang
	- 10.0.0-4ubuntu
- iproute2
	- iproute2-ss200127
- go
	- go1.16.7 linux/amd64


## 使い方
XDPの使い方を紹介します．
XDPプログラムを実行するまでの手順は以下です．
1. XDPが有効なカーネルか確認し依存関係を解決する
2. C言語(制限付き)でXDPプログラムを記述する
3. `clang`でBPFバイトコードにコンパイル
4. カーネルにロードする

それぞれを詳しく見ていきましょう.

### XDPが有効なカーネルであるか確認, 依存関係の解決

#### XDPが有効なカーネルか確認
まずはカーネルのバージョンを確認します．
Generic XDPが使えるのは`4.12`以上です．
<Tweet id="1217675419450634240"></Tweet>
このようなツイートもあるのでできるだけ最新に近いカーネルを使うのがよいと思います．
さらにカーネルのバージョンは要件を満たしていてもXDPを有効化してビルドされたものでなければ動かせません．
以下の設定が有効になっていることを確認します．
```
CONFIG_BPF=y
CONFIG_BPF_SYSCALL=y
CONFIG_BPF_JIT=y
CONFIG_HAVE_EBPF_JIT=y
CONFIG_XDP_SOCKETS=y
```
これらの設定は以下のコマンドで確認します．
```shell
$ grep -i CONFIG_BPF /boot/config-$(uname -r)
$ grep -i CONFIG_XDP_SOCKETS /boot/config-$(uname -r)
```
その他詳しい機能のサポートバージョンなどは[How to compile a kernel with XDP support](https://medium.com/@christina.jacob.koikara/how-to-compile-a-kernel-with-xdp-support-c245ed3460f1)をご覧ください．

#### 依存関係の解決
依存関係のセットアップは[xdp tutorialのSetup dependencies](https://github.com/xdp-project/xdp-tutorial/blob/master/setup_dependencies.org)をご覧ください．
各ディストリビューションのインストールについて記載されています．

### NICの設定
`Generic XDP`を使用する場合はあまり気にする必要はないですがNative XDP(NICに実際にロードするXDP)を使用する場合mtuやqueueの問題でロードが失敗する可能性があります．
[本実験環境](#実験環境)では以下のコマンドで設定を変更することでNICにXDPをロードすることができました．
```shell
$ sudo ip link set dev ens5 mtu 3498
$ sudo ethtool -L ens5 combined 1
```
<Tweet id="1446513432350519296"></Tweet>

### C言語(制限付き)でプログラムを記述する
C言語でプログラムを記述しますがBPFのプログラムは様々な制約があります．
主な制約は以下となっています．
- 命令数の制限
	- カーネルバージョン5.3以上で1M
- ループ制限
	- 無限ループは禁止
	- 5.2から有限ループは可能
- 到達不可能な命令があってはいけない
- 有効なメモリにのみアクセスできる
	- メモリが有効なものかチェックする必要がある

実際にプログラムを書く際の作法は[実践-BPF(XDP)用C言語のお作法](#bpf-xdp-用c言語のお作法)の項に記述しています．

BPFプログラムの制限に関する資料は以下を参照してください．
- [Introduction to eBPF and XDP](https://www.slideshare.net/lcplcp1/introduction-to-ebpf-and-xdp)
- [パケット処理の独自実装や高速化手法の比較と実践](https://www.janog.gr.jp/meeting/janog45/application/files/1615/7984/1029/008_pktfwd-xdp_kusakabe_00.pdf)

### `clang`でBPFバイトコードにコンパイルする
`example.c`を`example.o`に吐き出すコマンドは以下のような感じです．
```shell
$ clang -O2 -target bpf -c example.c -o example.o
```

### カーネルにロードする
コンパイルして生成されたELFファイルをカーネルにロードするすることによってXDPが実行されます．
ロードする方法はいくつか存在します．

#### iproute2
最も気軽に利用できるロード方法は`iproute2`を利用することです．
`iproute2`を利用する場合のロードは次のようにします．
```shell
$ ip link set dev ens5 xdp obj example.o
```
ロード後にNICの情報を見てみると以下のようにxdpプログラムがロードされています．
```
2: ens5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 3498 xdp qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 0e:66:45:0d:d9:b9 brd ff:ff:ff:ff:ff:ff
    prog/xdp id 67
```
XDPプログラムを外す場合は以下のコマンドを実行します．
```shell
$ sudo ip link set dev ens5 xdp off
```

#### プログラムからロードする
BPFマップを利用するような複雑なXDPプログラムを実行したい場合，コントロールプレーンとしてプログラムを書く必要があります．
コントロールプレーンはどの言語でも特に問題ありません．
本記事ではコントロールプレーンのプログラムにはGo言語を使用します．

## 実践
本項ではXDPプログラムを実際に書いて動かしてみます．
Go言語でXDPのコントロールプレーンを記述するパッケージがいくつかあります．
- [cilium/ebpf](https://github.com/cilium/ebpf)
- [dropbox/goebpf](https://github.com/dropbox/goebpf)
- [iovisor/gobpf](https://github.com/iovisor/gobpf)

スターの数や開発状況などから見ても`cilium/ebpf`がデファクトといってよいと思います．
これからGo+XDPで開発を行うのであれば`cilium/ebpf`を使うのがよいでしょう．
一方で`dropbox/goebpf`はexamplesにxdpのサンプルがいくつかあり，基本的なプログラムを学ぶには非常によいと思います．
また，作りがシンプルなのでとっかかりやすいのではないかと思います．
`iovisor/gobpf`は使用したことがないのでわかりませんが`CGO`という話なのであまりお勧めとは言えません．

いくつかライブラリを紹介しましたが本記事では`cilium/ebpf`を使用してプログラムを記述します．

今回の実践編のサンプルコードは以下のリポジトリにあります．
[![terassyi/go-xdp-examples - GitHub](https://gh-card.dev/repos/terassyi/go-xdp-examples.svg)](https://github.com/terassyi/go-xdp-examples)

### BPF(XDP)用C言語のお作法
BPFバイトコードにコンパイルするC言語は様々な制約があると述べました．
本項ではその制約について具体的な例を示します．

#### 命令数の制約
カーネルバージョン5.3から命令数制限は1Mとなっているので現実的にこの制約が問題となることはないでしょう．
もし命令数制限を超えるBPFプログラムをロードしたいとき，複数のプログラムに分割，ロードするということになります．
これを実現するための手段として`bpf_tail_call()`, `BPF_MAP_TYPE_PROG_ARRAY`が用意されています．
詳しいドキュメントは[cilium document - tail-calls](https://docs.cilium.io/en/stable/bpf/#tail-calls)をご覧ください．

#### 無限ループ禁止
無限ループは禁止ですが有限ループは可能です．
XDPではパケットの改変を行うのでチェックサムの計算を行う機会も多いです．
IPチェックサムを計算する関数を例示します．
このコードは`bufsize`がいずれ必ず1以下となるので有効です．
```c
static inline __u16 checksum(__u16 *buf, __u32 bufsize) {
	__u32 sum = 0;
	while (bufsize > 1) {
		sum += *buf;
		buf++;
		bufsize -= 2;
	}
	if (bufsize == 1) {
		sum += *(__u8 *)buf;
	}
	sum = (sum & 0xffff) + (sum >> 16);
	sum = (sum & 0xffff) + (sum >> 16);
	return ~sum;
}
```

#### 有効なメモリにのみアクセスする
BPFプログラムではアクセスしたいメモリが有効であるか明示的にチェックした後でしかアクセスできません．
頻出する有効メモリチェックを二つ示します．

##### パケットのパース
ここで`data`はNICから受け取ったデータの先頭のポインタ．`data_end`は末尾のポインタです．
`ether`というethernetヘッダ用変数のポインタに`data`を代入してethernetヘッダをパースします．
このとき，ヘッダサイズが`data_end`を超えている場合無効なメモリにアクセスすることとなるので`data + sizeof(*ether) > data_end`であることを明示的にチェックしなければなりません．
```c
void *data_end = (void *)(long)ctx->data_end;
void *data = (void *)(long)ctx->data;
struct ethhdr *ether = data;
if (data + sizeof(*ether) > data_end) {
  return XDP_ABORTED;
}
```

##### BPFマップのlookup
BPFマップの参照は値が存在しなかった場合NULLとなります．
そのため，参照結果がNULLでないことをチェックしてから値を使用しなければなりません．
```c
__u32 *val = bpf_map_lookup_elem(&map, key);
if (!val) {
	return XDP_PASS;
}
```

#### 処理を関数に切り分けるときはinline展開する
XDPプログラム本体として実行される以外の自作関数はすべてinline展開される必要があります．
そのため，自作関数にはすべて`static inline`をつけましょう．
[無限ループ禁止](#無限ループ禁止)で例示したchecksum()関数を参考にしてください．

#### eBPF組み込み関数しか使えない
`memset()`, `memcpy()`といった関数はllvm組み込みの関数を使用することとなります．
```c
__builtin_memset((dest), (chr), (n))
__builtin_memcpy((dest), (src), (n))
__builtin_memmove((dest), (src), (n))
```
とはいえ引数は変わらないので気を付けて大丈夫です．

#### グローバル変数が使えない
グローバル変数は使用できません．
変わりに毎回BPFマップから値をとってくることとなります．

#### 可変長引数を取れない
可変長引数をとる関数を作成・使用することができません．
例として`bpf_printk(fmt, ...)`を見てみます．
`bpf_printk()`は`bpf_trace_printk()`を使いやすくラップした関数です．
定義は以下です．
```c
#define bpf_printk(fmt, ...)                                   \
  ({                                                           \
    char ____fmt[] = fmt;                                      \
    bpf_trace_printk(____fmt, sizeof(____fmt), ##__VA_ARGS__); \
  })
```
以下のように文字列を含めた5つの引数をとらせてみます．
```c
int test(struct xdp_md *ctx)
{
    int a, b, c, d = 0;
    bpf_printk("%d %d %d %d", a, b, c, d);
    return XDP_PASS;
}
```
```shell
$ clang -O2 -target bpf -c example.c -o example.o
example.c:9:5: error: too many args to 0xb70290: i64 = Constant<6>
int test(struct xdp_md *ctx)
    ^
1 error generated.
```
コンパイルすると`too many args`と怒られます．
これを4つ以下の引数にすると無事コンパイルは通ります．
MACアドレスなどをデバッグ出力したいときに非常に困りますが仕方ありません．気を付けましょう．


その他制約やコンパイル方法などは次のドキュメントが詳しいです．
- [cilium docs bpf #llvm](https://docs.cilium.io/en/stable/bpf/#llvm)

### チュートリアル
この項ではチュートリアルとして[dropbox/goebpf/examples/xdp](https://github.com/dropbox/goebpf/tree/master/examples/xdp)にあるサンプルを`cilium/ebpf`を用いて動かしてみるということを行います．

`dropbox/goebpf/examples/xdp`配下には
- packet_counter
- xdp_dump
- basic_firewall
- bpf_redirect_map

の4つのサンプルがあります．
こちらのC言語で書かれたXDPプログラムは基本的にそのまま使用します.(一部変更しなければ動作しないものがあるため変更します．)


#### 構成
まずディレクトリ構成について軽く述べます．

[![terassyi/go-xdp-examples - GitHub](https://gh-card.dev/repos/terassyi/go-xdp-examples.svg)](https://github.com/terassyi/go-xdp-examples)

`/header/`配下に`bpf.h`, `bpf_helpers.h`を配置しています．これはBPFプログラムを記述するためのhelper関数などが定義されたヘッダファイルで，これらを使用することでBPFプログラム記述の負担が軽減されます．
今回配置しているのは`dropbox/goebpf/`に置いてあるものになっています．
様々なBPFプロジェクトが独自のヘッダファイルを使用している場合があり，微妙に定義が異なることもあるので注意してください．

各サンプルのディレクトリの中の`bpf/`配下にBPFプログラムを配置しています．
各サンプルのトップにはGoのプログラムが置いてあります．
ビルドなどはこのディレクトリで行います．

#### ビルド
ビルドに必要なステップは二つです．
```shell
$ go generate
$ go build .
```
`go generate`によって`bpf/`配下のC言語のコードをBPFバイトコードにコンパイルしてGoで扱うためのコードを自動生成します．
これは`bpf2go`([github.com/cilium/ebpf/cmd/bpf2go](https://github.com/cilium/ebpf/tree/master/cmd/bpf2go))というツールを使用しています．
`main.go`の中に`//go:generate`という感じで記述しておくことでコードを自動生成してくれます．
これが最初はとっつきにくいですが慣れると非常に便利です．

後は普通にビルドすることによってシングルバイナリとしてBPFのプログラムを扱うことができます．

#### packet_counter
`packet_counter`は指定されたNICが受信したパケットをプロトコルごとにカウントするプログラムです．
`main.go`と`bpf/xdp.c`から構成されます．
まずはXDPのコードから見ていきましょう．

##### XDP
まずはヘッダのインクルードと構造体の定義です．
`bpf_helpers.h`をインクルードします．
さらにパケットを表現する構造体を定義します．
しかし，これは`linux/if_ether.h`や`netinet/ip.h`などを使用してもかまいません．(むしろその方がよいと思います)

続いてBPFマップを定義します．
packet_counterでは`BPF_MAP_TYPE_PERCPU_ARRAY`を定義しています．
```c
// eBPF map to store IP proto counters (tcp, udp, etc)
BPF_MAP_DEF(protocols) = {
    .map_type = BPF_MAP_TYPE_PERCPU_ARRAY,
    .key_size = sizeof(__u32),
    .value_size = sizeof(__u64),
    .max_entries = 255,
};
BPF_MAP_ADD(protocols);
```
keyは4byte, valueは8byteで定義しています．
続いてXDP関数です．
```c
SEC("xdp")
int packet_count(struct xdp_md *ctx) {
	...
}
```
`xdp`というセクション名を割り当てた関数がパケットの受信の度に呼び出されることとなります．
この関数は`xdp_md`

#### xdp_dump

#### basic_firewall

#### bpf_redirect_map

## まとめ


## 参考

### 日本語
- [http://gundam-hathaway.net/mecha.html](http://gundam-hathaway.net/mecha.html)
- [Linuxカーネルの新機能 XDP (eXpress Data Path) を触ってみる](https://yunazuno.hatenablog.com/entry/2016/10/11/090245)
- [パケットフィルターでトレーシング？　Linuxで活用が進む「Berkeley Packet Filter（BPF）」とは何か](https://atmarkit.itmedia.co.jp/ait/articles/1811/21/news010.html)
- [XDPメモ（アーキテクチャ、性能、ユースケース）](https://blog.bobuhiro11.net/2020/09-17-xdp.html)
- [eXpress Data Path (XDP) の概要とLINEにおける利活用](https://speakerdeck.com/yunazuno/brief-summary-of-xdp-and-use-case-at-line)
- [パケット処理の独自実装や高速化手法の比較と実践](https://www.janog.gr.jp/meeting/janog45/application/files/1615/7984/1029/008_pktfwd-xdp_kusakabe_00.pdf)
- [転びながらもネットワーク処理をソフトウェアで自作していく話](https://speakerdeck.com/mabuchin/zhuan-binagaramonetutowakuchu-li-wo-sohutoueadezi-zuo-siteikuhua)
- [Generic XDPを使えばXDP動作環境がお手軽に構築できるようになった](https://yunazuno.hatenablog.com/entry/2017/06/12/094101)
- [今日から始めるXDPと取り巻く環境について](https://takeio.hatenablog.com/entry/2019/12/05/212945)
- [Go+XDPな開発を始めるときに参考になる記事/janog LT フォローアップ](https://takeio.hatenablog.com/entry/2021/01/26/180129)
- [ヘッダ構造体メモ](https://chipa34.hatenadiary.org/entry/20081217/1229479548)

### 英語
- [bpf(2) - Linux manual page - man7.org](https://man7.org/linux/man-pages/man2/bpf.2.html)
- [bpf-helpers(7) - Linux manual page - man7.org](https://man7.org/linux/man-pages/man7/bpf-helpers.7.html)
- [XDP - IO Visor Project](https://www.iovisor.org/technology/xdp)
- [A practical introduction to XDP](https://www.linuxplumbersconf.org/event/2/contributions/71/attachments/17/9/presentation-lpc2018-xdp-tutorial.pdf)
- [L4Drop: XDP DDoS Mitigations](https://blog.cloudflare.com/l4drop-xdp-ebpf-based-ddos-mitigations/)
- [Open-sourcing Katran, a scalable network load balancer](https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/)
- [XDP Actions](https://prototype-kernel.readthedocs.io/en/latest/networking/XDP/implementation/xdp_actions.html)
- [BPF In Depth: Communicating with Userspace](https://blogs.oracle.com/linux/post/bpf-in-depth-communicating-with-userspace)
- [cilium docs bpf #llvm](https://docs.cilium.io/en/stable/bpf/#llvm)
- [How to compile a kernel with XDP support](https://medium.com/@christina.jacob.koikara/how-to-compile-a-kernel-with-xdp-support-c245ed3460f1)
- [cilium/ebpf](https://github.com/cilium/ebpf)
- [dropbox/goebpf](https://github.com/dropbox/goebpf)

<script>
import { Tweet } from 'vue-tweet-embed/dist'

export default {
    components: {Tweet}
}
</script>
