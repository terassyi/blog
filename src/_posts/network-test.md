---
category: network
tags:
    - network
    - aws
    - tcp
date: 2021-08-15
title: ネットワーク実験 ~NATやリバースプロキシを経由するTCP/IP通信~
---

## はじめに
私たちの日常にWebアプリケーションは欠かせないものとなっています．
そして私たちは普段，アプリケーションにアクセスするための土台たるネットワークに意識を向けることはほとんどありません．
しかしそのネットワークは非常に多くの技術が複雑に協調動作しながら動作しています．

今回はみなさんが知らず知らずのうちに使用しているNATやリバースプロキシ(ロードバランサ)を経由した通信について実験してみます．
本実験で注目するのはIPとTCPです．
クライアントからのリクエストがWebサーバに送信されてレスポンスが返ってくるまでにNATやリバースプロキシを経由することでどのようにIPアドレスの変換が行われTCPセッションが張られるのかを検証します．

## 一般的なWebアプリケーションのインフラ構成
Webサービスを運用するための基盤として一般的なのがAWSなどのパブリッククラウドサービスです．
クラウドを利用することで柔軟にサービスを運用することができます．
とはいえ，サービスを運用するためには様々なことについて考えてインフラを設計する必要があります．
主に考慮すべき点は以下です．
- 耐障害性
- 冗長性
- 堅牢性
これらの考慮事項を満たしたWebアプリケーションインフラの構成は実はけっこう複雑です．
アーキテクチャの例は[AWS で構築する Web システムアーキテクチャ - Awsstatic](https://d1.awsstatic.com/events/jp/2020/innovate/pdf/S-9_AWSInnovate_Online_Conference_2020_Spring_AWS_Web_System_Architecture.pdf)で紹介されています．

上の資料で例示されている*構成パターン2: トレードオフを考慮した構成*という構成が現在のアプリケーションインフラの基本構成だと考えられます．(既に古い可能性あり)

## 実験準備

### 実験環境構成
一般的構成を踏まえて，本実験で使用する環境をこのように構築しました．以下これを実験環境とします．
![base](img/network-test-base.png)

緑のゾーンがPublic Subnetで青のゾーンがPrivate Subnetとなっています．
パブリックサブネットにはロードバランサやNATゲートウェイが配置されます．
プライベートサブネットにはWebサーバが配置されます．

### 用語
ここまでいくつかの用語を説明なしに使ってきました．
ここで各用語の意味を確認しておきます．

#### VPC(Virtual Private Cloud)
	論理的に独立した仮想ネットワーク．

#### Internet Gateway(AWS)
	VPCとインターネットとの間を通信可能にするコンポーネント．
	VPCにアタッチすることでVPCのパブリックサブネットに配置されたインスタンスはグローバルIPアドレスが割り振られインターネットに接続できるようになる．

	[https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/VPC_Internet_Gateway.html](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/VPC_Internet_Gateway.html)

#### NAT Gateway(AWS)
	AWSが提供するネットワークアドレス変換(NAT)サービス．
	NATゲートウェイをVPCのパブリックサブネットに配置することでプライベートサブネットに配置されたインスタンスはインターネットに向けた通信を行うことができるようになります．また，外からはアクセスできません．

	[https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/vpc-nat-gateway.html](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/vpc-nat-gateway.html)

#### Reverse Proxy(Load Balancer)
	外部ネットワーク（インターネット）からの接続を受け、何らかの処理を行った上で内部のサーバーに引き渡す、中継機能を果たす機器のことです.
	通常アプリケーションサーバの前段に配置され，クライアントからのリクエストを待ち受けます．
	リバースプロキシを使用する目的は以下です．
	- 負荷分散
	- 認証
	- 暗号化
	- 高速化
	- 仮想的なサーバの統合(冗長化)

#### NAT(Network Address Translation)
	IPアドレスを変換する技術です．一般的にプライベートIPアドレスとグローバルIPアドレスを変換する技術です．
	NATにはいくつか種類が存在します．
	- Static NAT
	- Dynamic NAT
	- NAPT(Network Address Port Translation)
	それぞれ説明します．

##### Static NAT
	LAN内部のIPアドレスに対して1対1でグローバルIPアドレスを割り当てることでアドレスの変換を行います．
	これによりLAN内部のノードは外部ネットワークに接続できるようになります．
	インターネットゲートウェイはこのStatic NATを利用しています．

##### Dynamic NAT
	内部アドレスと外部アドレスを多対多で動的に割り当てます．予め複数のグローバルアドレスをLANに割り当てることで要求に応じて割り当てます．

##### NAPT(Network Address Port Translation)
	一般的にNATというとこのNAPTの機能を指すことが多いです．
	LinuxにおいてはIPマスカレードと呼ばれることも多いです．
	NAPTはIPアドレスに加え，ポート番号も変換します．
	IPアドレスとポートのペアを変換の対象とすることで少ない(一つ)のグローバルIPアドレスに対して同時に複数のLAN内部のノードを割り当てることができます．
	NATゲートウェイはこちらの技術です．

### ツール
今回使用するツールについて軽く紹介します．
- ip
- traceroute
- dig
- tcpdump
- netstat

#### ip
ネットワークにおける様々なことを行うことのできるツールです．(ここには書ききれない)
使いそうなコマンド例をいくつか例示します
- `ip a`
- `ip route show`

#### traceroute
パケットが宛先に到達するまでに経由するルーターを列挙するコマンドです．

#### ping
パケットが宛先に到達しているかどうかを調査するためのコマンドです．

#### dig
ドメイン名からIPアドレスを調べるためのコマンドです．

#### tcpdump
パケットキャプチャを行うツールです．
いくつかオプションを紹介します．
- i インターフェースを指定してキャプチャ
- w キャプチャしたパケットをファイルに書き込み
- r pcap形式のパケットダンプファイルを読み込む
- v(vv, vvv) パケットの詳細を表示する
- A パケットをASCII表示する

その他にもプロトコルやアドレス，ポートでフィルタリングできます．

#### netstat
ネットワーク接続やルーティング情報，ネットワーク関連の統計情報などを表示することのできるツールです．
tcpコネクションをかくにんするためには以下のコマンドです．
```
$ netstat -t -c
```

## 実験
それでは実験を行います．
段階的に実験を行い徐々に理解していきます．
本実験に使用するサーバは以下のようなものを使用します．
```
ubuntu@ip-10-100-10-146:~$ cat /etc/os-release
NAME="Ubuntu"
VERSION="20.04.2 LTS (Focal Fossa)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 20.04.2 LTS"
VERSION_ID="20.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
VERSION_CODENAME=focal
UBUNTU_CODENAME=focal
```
```
ubuntu@ip-10-100-10-146:~$ uname -a
Linux ip-10-100-10-146 5.4.0-1045-aws #47-Ubuntu SMP Tue Apr 13 07:02:25 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux
ubuntu@ip-10-100-10-146:~$ python3 -V
Python 3.8.5
```

### 実験1
まずはじめに最も単純な構成について実験してみます．
構成は以下のようになっています．
![ex1](img/network-test-ex1.png)

#### 準備
ssh接続でサーバーに入り，以下のようにコマンドを実行してhttpサーバを立てます．
危険なので本来はこのようなことはしないようにしましょう．
```
ubuntu@ip-10-100-10-146:~$ mkdir network-test
ubuntu@ip-10-100-10-146:~$ cd network-test/
ubuntu@ip-10-100-10-146:~/network-test$ echo Hello network test!! > index.html
echo Hello network testcd network-test/ > index.html
ubuntu@ip-10-100-10-146:~/network-test$ ll
total 12
drwxrwxr-x 2 ubuntu ubuntu 4096 Aug 15 10:19 ./
drwxr-xr-x 5 ubuntu ubuntu 4096 Aug 15 10:18 ../
-rw-rw-r-- 1 ubuntu ubuntu   35 Aug 15 10:19 index.html
ubuntu@ip-10-100-10-146:~/network-test$ sudo python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

#### 評価
1. traceroute
	```
	$ sudo traceroute -I 35.76.126.5
	traceroute to 35.76.126.5 (35.76.126.5), 30 hops max, 60 byte packets
	 1  terassyi.mshome.net (172.21.240.1)  0.462 ms  0.449 ms  0.448 ms
	 			...
	14  54.240.229.209 (54.240.229.209)  22.111 ms  22.108 ms  22.104 ms
				...
	20  52.93.72.216 (52.93.72.216)  22.086 ms  19.951 ms  19.938 ms
	21  52.93.72.215 (52.93.72.215)  21.784 ms  21.784 ms  21.784 ms
	22  52.93.72.198 (52.93.72.198)  23.884 ms  23.883 ms  23.882 ms
	23  52.93.250.24 (52.93.250.24)  21.780 ms  29.955 ms  29.935 ms
				...
	30  ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com (35.76.126.5)  24.016 ms  24.015 ms  22.924 ms
	```
	たくさんのルータを経由して目的のサーバに到達できていることがわかります．
	私の環境ではWSL内からアクセスしているので最初のルーターがWSLのネットワークからLANにでるためのルータとなっていますね．

2. ブラウザからアクセスできることを確かめます．
	![ex1-res1]
	アクセスできました．

3. クライアント側とサーバ側両方からtcpdumpでパケットをキャプチャしてみます．
	クライアント側
	```
	$ sudo tcpdump -i eth0 host 35.76.126.5 and tcp port 80
	tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
	listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
	19:34:34.069926 IP 172.21.254.3.44134 > ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http: Flags [S], seq 525950805, win 64240, options [mss 1460,sackOK,TS val 4139878943 ecr 0,nop,wscale 7], length 0
	19:34:34.091911 IP ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http > 172.21.254.3.44134: Flags [S.], seq 3557333592, ack 525950806, win 62643, options [mss 1452,sackOK,TS val 2673471217 ecr 4139878943,nop,wscale 7], length 0
	19:34:34.091992 IP 172.21.254.3.44134 > ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http: Flags [.], ack 1, win 502, options [nop,nop,TS val 4139878965 ecr 2673471217], length 0
	19:34:34.092090 IP 172.21.254.3.44134 > ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http: Flags [P.], seq 1:86, ack 1, win 502, options [nop,nop,TS val 4139878965 ecr 2673471217], length 85: HTTP: GET /index.html HTTP/1.1
	19:34:34.112685 IP ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http > 172.21.254.3.44134: Flags [.], ack 86, win 489, options [nop,nop,TS val 2673471238 ecr 4139878965], length 0
	19:34:34.113182 IP ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http > 172.21.254.3.44134: Flags [P.], seq 1:185, ack 86, win 489, options [nop,nop,TS val 2673471238 ecr 4139878965], length 184: HTTP: HTTP/1.0 200 OK
	19:34:34.113184 IP ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http > 172.21.254.3.44134: Flags [FP.], seq 185:220, ack 86, win 489, options [nop,nop,TS val 2673471239 ecr 4139878965], length 35: HTTP
	19:34:34.113204 IP 172.21.254.3.44134 > ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http: Flags [.], ack 185, win 501, options [nop,nop,TS val 4139878986 ecr 2673471238], length 0
	19:34:34.113623 IP 172.21.254.3.44134 > ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http: Flags [F.], seq 86, ack 221, win 501, options [nop,nop,TS val 4139878987 ecr 2673471239], length 0
	19:34:34.135067 IP ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com.http > 172.21.254.3.44134: Flags [.], ack 87, win 489, options [nop,nop,TS val 2673471260 ecr 4139878987], length 0
	^C
	10 packets captured
	10 packets received by filter
	```
	サーバ側
	```
	ubuntu@ip-10-100-10-146:~$ sudo tcpdump -i eth0 tcp port 80
	tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
	listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
	10:34:35.647704 IP 218-40-234-193.ppp.bbiq.jp.63704 > ip-10-100-10-146.http: Flags [S], seq 525950805, win 64240, options [mss 1452,sackOK,TS val 4139878943 ecr 0,nop,wscale 7], length 0
	10:34:35.647745 IP ip-10-100-10-146.http > 218-40-234-193.ppp.bbiq.jp.63704: Flags [S.], seq 3557333592, ack 525950806, win 62643, options [mss 8961,sackOK,TS val 2673471217 ecr 4139878943,nop,wscale 7], length 0
	10:34:35.668379 IP 218-40-234-193.ppp.bbiq.jp.63704 > ip-10-100-10-146.http: Flags [.], ack 1, win 502, options [nop,nop,TS val 4139878965 ecr 2673471217], length 0
	10:34:35.668379 IP 218-40-234-193.ppp.bbiq.jp.63704 > ip-10-100-10-146.http: Flags [P.], seq 1:86, ack 1, win 502, options [nop,nop,TS val 4139878965 ecr 2673471217], length 85: HTTP: GET /index.html HTTP/1.1
	10:34:35.668428 IP ip-10-100-10-146.http > 218-40-234-193.ppp.bbiq.jp.63704: Flags [.], ack 86, win 489, options [nop,nop,TS val 2673471238 ecr 4139878965], length 0
	10:34:35.669252 IP ip-10-100-10-146.http > 218-40-234-193.ppp.bbiq.jp.63704: Flags [P.], seq 1:185, ack 86, win 489, options [nop,nop,TS val 2673471238 ecr 4139878965], length 184: HTTP: HTTP/1.0 200 OK
	10:34:35.669322 IP ip-10-100-10-146.http > 218-40-234-193.ppp.bbiq.jp.63704: Flags [FP.], seq 185:220, ack 86, win 489, options [nop,nop,TS val 2673471239 ecr 4139878965], length 35: HTTP
	10:34:35.690913 IP 218-40-234-193.ppp.bbiq.jp.63704 > ip-10-100-10-146.http: Flags [.], ack 185, win 501, options [nop,nop,TS val 4139878986 ecr 2673471238], length 0
	10:34:35.691162 IP 218-40-234-193.ppp.bbiq.jp.63704 > ip-10-100-10-146.http: Flags [F.], seq 86, ack 221, win 501, options [nop,nop,TS val 4139878987 ecr 2673471239], length 0
	10:34:35.691172 IP ip-10-100-10-146.http > 218-40-234-193.ppp.bbiq.jp.63704: Flags [.], ack 87, win 489, options [nop,nop,TS val 2673471260 ecr 4139878987], length 0
	^C
	10 packets captured
	10 packets received by filter
	```
	二つの結果を見比べてみます．
	クライアントでは`ec2-35-76-126-5.ap-northeast-1.compute.amazonaws.com:80`に`172.21.254.3:44134(私のWSLのプライベートアドレス)`からパケットを送っています．
	それに対してサーバは`218-40-234-193.ppp.bbiq.jp:63704`からパケットを受け取っていますね．このアドレスを調べてみると実験を行っているネットワークのNATに紐づいているグローバルアドレスのようです．
	今回クライアント側のNATに関しては特に触れません．
	この結果から，今回の構成ではサーバは直にリクエストパケットを受け取りそのアドレスに返していることがわかります．
	つまりTCPのコネクションもend to endで結ばれています．

### 実験2
実験2では実験1でpublicに配置されていたwebサーバをprivateなサブネットに移動させます．
privateなサブネットにWebサーバが存在する場合に最初に示した実験環境と同様の構成を構築する必要があります．
ここで，NATゲートウェイがない場合どうなるのでしょうか．
実験2ではNATゲートウェイがない場合クライアントが送ったリクエストに対してどのような挙動となるのかを検証します．

とおもいましたがそもそもNATゲートウェイがないと`apt update`すらできないためおとなしくNATゲートウェイをつくりましょう．
結果は当然繋がらない．です．

### 実験3
実験3では冒頭に紹介した実験環境でパケットの流れ方やTCPセッションについて検証します．

#### 準備
1. privateサブネットに新しくインスタンス(このインスタンスをwebとします．)を配置します．
2. publicサブネットに新しくインスタンスを作成します．(以下このインスタンスのことをlbとします．)
3. webには直接sshできないのでlb経由でssh接続できるようにします
	1. webの接続に必要な秘密鍵をlbの`~/.ssh`にscpでローカルからコピーします．
	2. lbにsshして鍵がコピーされていることを確認
	3. `$ ssh -i <鍵のパス> ubuntu@<webのprivate addr>`で接続します．
4. lbにOSSのreverse proxyツールであるnginxを入れて設定します．
	1. lbにssh
	2. nginxをインストール(`$ sudo apt install nginx`)
	3. `/etc/nginx/nginx.conf`を[こちら](https://gist.github.com/terassyi/44a163782f689d503b3697130d2222bd#file-nginx-conf)に修正します．
	4. `$ sudo systemctl start nginx`でnginxを起動します．
5. webでwebサーバを起動させます．
	1. `$ sudo apt install python3-pip`
	2. `$ sudo pip install Flask`
	3. `app.py`として[こちら](https://gist.github.com/terassyi/44a163782f689d503b3697130d2222bd#file-app-py)をコピーします．
	3. `$ sudo python3 app.py`を実行します．
6. ブラウザからlbのグローバルアドレスにアクセスして返答が返ってくることを確認します．

#### 検証
アクセスできることが確認出来たら検証を開始します．
ローカルのブラウザからアクセスしたときのtcpdumpの結果を比べてみます．

##### lb
```
ubuntu@ip-10-100-10-220:~$ sudo tcpdump -i eth0 tcp port 80
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
14:57:45.059592 IP 218-40-234-193.ppp.bbiq.jp.54892 > ip-10-100-10-220.http: Flags [S], seq 2101407630, win 64240, options [mss 1452,nop,wscale 8,nop,nop,sackOK], length 0
14:57:45.059592 IP 218-40-234-193.ppp.bbiq.jp.63152 > ip-10-100-10-220.http: Flags [S], seq 900812540, win 64240, options [mss 1452,nop,wscale 8,nop,nop,sackOK], length 0
14:57:45.059630 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.54892: Flags [S.], seq 3307607793, ack 2101407631, win 62727, options [mss 8961,nop,nop,sackOK,nop,wscale 7], length 0
14:57:45.059640 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.63152: Flags [S.], seq 628803793, ack 900812541, win 62727, options [mss 8961,nop,nop,sackOK,nop,wscale 7], length 0
14:57:45.080907 IP 218-40-234-193.ppp.bbiq.jp.54892 > ip-10-100-10-220.http: Flags [.], ack 1, win 516, length 0
14:57:45.080907 IP 218-40-234-193.ppp.bbiq.jp.63152 > ip-10-100-10-220.http: Flags [.], ack 1, win 516, length 0
14:57:45.082199 IP 218-40-234-193.ppp.bbiq.jp.63152 > ip-10-100-10-220.http: Flags [P.], seq 1:468, ack 1, win 516, length 467: HTTP: GET / HTTP/1.1
14:57:45.082210 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.63152: Flags [.], ack 468, win 487, length 0
14:57:45.082285 IP ip-10-100-10-220.49738 > 10.100.20.57.http: Flags [S], seq 1233502736, win 62727, options [mss 8961,sackOK,TS val 2411726199 ecr 0,nop,wscale 7], length 0
14:57:45.082860 IP 10.100.20.57.http > ip-10-100-10-220.49738: Flags [S.], seq 2884583824, ack 1233502737, win 62643, options [mss 8961,sackOK,TS val 2501986252 ecr 2411726199,nop,wscale 7], length 0
14:57:45.082873 IP ip-10-100-10-220.49738 > 10.100.20.57.http: Flags [.], ack 1, win 491, options [nop,nop,TS val 2411726200 ecr 2501986252], length 0
14:57:45.082899 IP ip-10-100-10-220.49738 > 10.100.20.57.http: Flags [P.], seq 1:462, ack 1, win 491, options [nop,nop,TS val 2411726200 ecr 2501986252], length 461: HTTP: GET / HTTP/1.0
14:57:45.083454 IP 10.100.20.57.http > ip-10-100-10-220.49738: Flags [.], ack 462, win 486, options [nop,nop,TS val 2501986253 ecr 2411726200], length 0
14:57:45.085637 IP 10.100.20.57.http > ip-10-100-10-220.49738: Flags [P.], seq 1:18, ack 462, win 486, options [nop,nop,TS val 2501986255 ecr 2411726200], length 17: HTTP: HTTP/1.0 200 OK
14:57:45.085645 IP ip-10-100-10-220.49738 > 10.100.20.57.http: Flags [.], ack 18, win 491, options [nop,nop,TS val 2411726203 ecr 2501986255], length 0
14:57:45.085795 IP 10.100.20.57.http > ip-10-100-10-220.49738: Flags [FP.], seq 18:202, ack 462, win 486, options [nop,nop,TS val 2501986255 ecr 2411726200], length 184: HTTP
14:57:45.085843 IP ip-10-100-10-220.49738 > 10.100.20.57.http: Flags [F.], seq 462, ack 203, win 490, options [nop,nop,TS val 2411726203 ecr 2501986255], length 0
14:57:45.085859 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.63152: Flags [P.], seq 1:220, ack 468, win 487, length 219: HTTP: HTTP/1.1 200 OK
14:57:45.086260 IP 10.100.20.57.http > ip-10-100-10-220.49738: Flags [.], ack 463, win 486, options [nop,nop,TS val 2501986256 ecr 2411726203], length 0
14:57:45.153875 IP 218-40-234-193.ppp.bbiq.jp.63152 > ip-10-100-10-220.http: Flags [.], ack 220, win 515, length 0
14:58:30.084257 IP 218-40-234-193.ppp.bbiq.jp.54892 > ip-10-100-10-220.http: Flags [.], seq 0:1, ack 1, win 516, length 1: HTTP
14:58:30.084284 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.54892: Flags [.], ack 1, win 491, options [nop,nop,sack 1 {0:1}], length 0
14:58:30.115086 IP 218-40-234-193.ppp.bbiq.jp.63152 > ip-10-100-10-220.http: Flags [.], seq 467:468, ack 220, win 515, length 1: HTTP
14:58:30.115101 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.63152: Flags [.], ack 468, win 487, options [nop,nop,sack 1 {467:468}], length 0
14:58:45.132021 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.54892: Flags [F.], seq 1, ack 1, win 491, length 0
14:58:45.153450 IP 218-40-234-193.ppp.bbiq.jp.54892 > ip-10-100-10-220.http: Flags [.], ack 2, win 516, length 0
14:58:47.787476 IP 218-40-234-193.ppp.bbiq.jp.54892 > ip-10-100-10-220.http: Flags [F.], seq 1, ack 2, win 516, length 0
14:58:47.787510 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.54892: Flags [.], ack 2, win 491, length 0
14:59:00.099165 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.63152: Flags [F.], seq 220, ack 468, win 487, length 0
14:59:00.119848 IP 218-40-234-193.ppp.bbiq.jp.63152 > ip-10-100-10-220.http: Flags [.], ack 221, win 515, length 0
14:59:00.128427 IP 218-40-234-193.ppp.bbiq.jp.63152 > ip-10-100-10-220.http: Flags [F.], seq 468, ack 221, win 515, length 0
14:59:00.128459 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.63152: Flags [.], ack 469, win 487, length 0
^C
32 packets captured
32 packets received by filter

```

##### web
```
ubuntu@ip-10-100-20-57:~$ sudo tcpdump -i eth0 tcp port 80
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
14:57:45.117945 IP 10.100.10.220.49738 > ip-10-100-20-57.http: Flags [S], seq 1233502736, win 62727, options [mss 8961,sackOK,TS val 2411726199 ecr 0,nop,wscale 7], length 0
14:57:45.117987 IP ip-10-100-20-57.http > 10.100.10.220.49738: Flags [S.], seq 2884583824, ack 1233502737, win 62643, options [mss 8961,sackOK,TS val 2501986252 ecr 2411726199,nop,wscale 7], length 0
14:57:45.118486 IP 10.100.10.220.49738 > ip-10-100-20-57.http: Flags [.], ack 1, win 491, options [nop,nop,TS val 2411726200 ecr 2501986252], length 0
14:57:45.118486 IP 10.100.10.220.49738 > ip-10-100-20-57.http: Flags [P.], seq 1:462, ack 1, win 491, options [nop,nop,TS val 2411726200 ecr 2501986252], length 461: HTTP: GET / HTTP/1.0
14:57:45.118524 IP ip-10-100-20-57.http > 10.100.10.220.49738: Flags [.], ack 462, win 486, options [nop,nop,TS val 2501986253 ecr 2411726200], length 0
14:57:45.120733 IP ip-10-100-20-57.http > 10.100.10.220.49738: Flags [P.], seq 1:18, ack 462, win 486, options [nop,nop,TS val 2501986255 ecr 2411726200], length 17: HTTP: HTTP/1.0 200 OK
14:57:45.120876 IP ip-10-100-20-57.http > 10.100.10.220.49738: Flags [FP.], seq 18:202, ack 462, win 486, options [nop,nop,TS val 2501986255 ecr 2411726200], length 184: HTTP
^C
7 packets captured
10 packets received by filter
```

#### 評価
みんなでしましょう．


### 実験3
さて，実験を二つやってみました．これでロードバランサがどのようにTCPセッションを中継しているのかが把握できました．
しかし，NATゲートウェイの影が見当たらない．どこ？
というわけでprivateサブネットのデフォルトゲートウェイをlbのインスタンスにしてみます．

#### 準備
1. AWSのコンソールでprivateサブネットのルートテーブルを編集してデフォルトゲートウェイをlbに向けます
2. lbにログインして`sudo sysctl -w net.ipv4.ip_forward=1`を実行します．


#### 検証
手探りです．
手順2まで実行した段階ではwebから`ping 8.8.8.8`は通りません．そもそも到達していない模様です．
ではブラウザアクセスとパケットキャプチャしてみます．
結果はしっかり応答が返ってきました．
以下パケットキャプチャです．

##### lb
```
ubuntu@ip-10-100-10-220:~$ sudo tcpdump -i eth0 tcp and not port 22
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
15:39:09.857904 IP 218-40-234-193.ppp.bbiq.jp.64014 > ip-10-100-10-220.http: Flags [.], seq 1557414660:1557414661, ack 512903363, win 516, length 1: HTTP
15:39:09.857936 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.64014: Flags [.], ack 1, win 491, options [nop,nop,sack 1 {0:1}], length 0
15:39:09.871381 IP 218-40-234-193.ppp.bbiq.jp.59987 > ip-10-100-10-220.http: Flags [.], seq 1859609761:1859609762, ack 638123768, win 515, length 1: HTTP
15:39:09.871394 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.59987: Flags [.], ack 1, win 487, options [nop,nop,sack 1 {0:1}], length 0
15:39:14.507829 IP 218-40-234-193.ppp.bbiq.jp.59987 > ip-10-100-10-220.http: Flags [P.], seq 1:468, ack 1, win 515, length 467: HTTP: GET / HTTP/1.1
15:39:14.507866 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.59987: Flags [.], ack 468, win 484, length 0
15:39:14.507983 IP ip-10-100-10-220.49750 > 10.100.20.57.http: Flags [S], seq 3897877987, win 62727, options [mss 8961,sackOK,TS val 2414215625 ecr 0,nop,wscale 7], length 0
15:39:14.508570 IP 10.100.20.57.http > ip-10-100-10-220.49750: Flags [S.], seq 2727114356, ack 3897877988, win 62643, options [mss 8961,sackOK,TS val 2504475671 ecr 2414215625,nop,wscale 7], length 0
15:39:14.508585 IP ip-10-100-10-220.49750 > 10.100.20.57.http: Flags [.], ack 1, win 491, options [nop,nop,TS val 2414215626 ecr 2504475671], length 0
15:39:14.508611 IP ip-10-100-10-220.49750 > 10.100.20.57.http: Flags [P.], seq 1:462, ack 1, win 491, options [nop,nop,TS val 2414215626 ecr 2504475671], length 461: HTTP: GET / HTTP/1.0
15:39:14.509063 IP 10.100.20.57.http > ip-10-100-10-220.49750: Flags [.], ack 462, win 486, options [nop,nop,TS val 2504475672 ecr 2414215626], length 0
15:39:14.510997 IP 10.100.20.57.http > ip-10-100-10-220.49750: Flags [P.], seq 1:18, ack 462, win 486, options [nop,nop,TS val 2504475674 ecr 2414215626], length 17: HTTP: HTTP/1.0 200 OK
15:39:14.511004 IP ip-10-100-10-220.49750 > 10.100.20.57.http: Flags [.], ack 18, win 491, options [nop,nop,TS val 2414215628 ecr 2504475674], length 0
15:39:14.511115 IP 10.100.20.57.http > ip-10-100-10-220.49750: Flags [FP.], seq 18:202, ack 462, win 486, options [nop,nop,TS val 2504475674 ecr 2414215626], length 184: HTTP
15:39:14.511161 IP ip-10-100-10-220.49750 > 10.100.20.57.http: Flags [F.], seq 462, ack 203, win 490, options [nop,nop,TS val 2414215628 ecr 2504475674], length 0
15:39:14.511181 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.59987: Flags [P.], seq 1:220, ack 468, win 484, length 219: HTTP: HTTP/1.1 200 OK
15:39:14.511564 IP 10.100.20.57.http > ip-10-100-10-220.49750: Flags [.], ack 463, win 486, options [nop,nop,TS val 2504475674 ecr 2414215628], length 0
15:39:14.575577 IP 218-40-234-193.ppp.bbiq.jp.59987 > ip-10-100-10-220.http: Flags [.], ack 220, win 514, length 0
15:39:24.857705 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.64014: Flags [F.], seq 1, ack 1, win 491, length 0
15:39:24.879077 IP 218-40-234-193.ppp.bbiq.jp.64014 > ip-10-100-10-220.http: Flags [.], ack 2, win 516, length 0
15:39:59.535437 IP 218-40-234-193.ppp.bbiq.jp.59987 > ip-10-100-10-220.http: Flags [.], seq 467:468, ack 220, win 514, length 1: HTTP
15:39:59.535469 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.59987: Flags [.], ack 468, win 484, options [nop,nop,sack 1 {467:468}], length 0
15:40:09.879924 IP 218-40-234-193.ppp.bbiq.jp.64014 > ip-10-100-10-220.http: Flags [.], seq 0:1, ack 2, win 516, length 1: HTTP
15:40:09.879956 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.64014: Flags [.], ack 1, win 491, length 0
15:40:10.962914 IP 218-40-234-193.ppp.bbiq.jp.64014 > ip-10-100-10-220.http: Flags [F.], seq 1, ack 2, win 516, length 0
15:40:10.962947 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.64014: Flags [.], ack 2, win 491, length 0
15:40:29.571526 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.59987: Flags [F.], seq 220, ack 468, win 484, length 0
15:40:29.591280 IP 218-40-234-193.ppp.bbiq.jp.59987 > ip-10-100-10-220.http: Flags [.], ack 221, win 514, length 0
15:40:33.925510 IP 218-40-234-193.ppp.bbiq.jp.59987 > ip-10-100-10-220.http: Flags [F.], seq 468, ack 221, win 514, length 0
15:40:33.925540 IP ip-10-100-10-220.http > 218-40-234-193.ppp.bbiq.jp.59987: Flags [.], ack 469, win 484, length 0
^C
30 packets captured
30 packets received by filter
```
web
```
ubuntu@ip-10-100-20-57:~$ sudo tcpdump -i eth0 tcp and not port 22
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
15:39:14.536875 IP 10.100.10.220.49750 > ip-10-100-20-57.http: Flags [S], seq 3897877987, win 62727, options [mss 8961,sackOK,TS val 2414215625 ecr 0,nop,wscale 7], length 0
15:39:14.536914 IP ip-10-100-20-57.http > 10.100.10.220.49750: Flags [S.], seq 2727114356, ack 3897877988, win 62643, options [mss 8961,sackOK,TS val 2504475671 ecr 2414215625,nop,wscale 7], length 0
15:39:14.537440 IP 10.100.10.220.49750 > ip-10-100-20-57.http: Flags [.], ack 1, win 491, options [nop,nop,TS val 2414215626 ecr 2504475671], length 0
15:39:14.537440 IP 10.100.10.220.49750 > ip-10-100-20-57.http: Flags [P.], seq 1:462, ack 1, win 491, options [nop,nop,TS val 2414215626 ecr 2504475671], length 461: HTTP: GET / HTTP/1.0
15:39:14.537472 IP ip-10-100-20-57.http > 10.100.10.220.49750: Flags [.], ack 462, win 486, options [nop,nop,TS val 2504475672 ecr 2414215626], length 0
15:39:14.539360 IP ip-10-100-20-57.http > 10.100.10.220.49750: Flags [P.], seq 1:18, ack 462, win 486, options [nop,nop,TS val 2504475674 ecr 2414215626], length 17: HTTP: HTTP/1.0 200 OK
15:39:14.539510 IP ip-10-100-20-57.http > 10.100.10.220.49750: Flags [FP.], seq 18:202, ack 462, win 486, options [nop,nop,TS val 2504475674 ecr 2414215626], length 184: HTTP
^C
7 packets captured
10 packets received by filter
```

#### 評価
こちらもみんなでかんがえましょう．

### 実験4
NAT(NAPT)とはどういったものなのか，調べてみます．

#### 準備

##### 検証

###### inside LAN
```
Capturing on 'eth0'
    1 0.000000000 172.20.6.246 → 93.184.216.34 TCP 74 48792 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1 TSval=2331453215 TSecr=0 WS=128
    2 0.282536100 93.184.216.34 → 172.20.6.246 TCP 74 80 → 48792 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0 MSS=1452 SACK_PERM=1 TSval=2186059229 TSecr=2331453215 WS=512
    3 0.282583900 172.20.6.246 → 93.184.216.34 TCP 66 48792 → 80 [ACK] Seq=1 Ack=1 Win=64256 Len=0 TSval=2331453497 TSecr=2186059229
    4 0.282721800 172.20.6.246 → 93.184.216.34 HTTP 141 GET / HTTP/1.1
    5 0.590089600 93.184.216.34 → 172.20.6.246 TCP 66 80 → 48792 [ACK] Seq=1 Ack=76 Win=65536 Len=0 TSval=2186059510 TSecr=2331453497
    6 0.590089800 93.184.216.34 → 172.20.6.246 HTTP 1678 HTTP/1.1 200 OK  (text/html)
    7 0.590119100 172.20.6.246 → 93.184.216.34 TCP 66 48792 → 80 [ACK] Seq=76 Ack=1613 Win=64128 Len=0 TSval=2331453805 TSecr=2186059510
    8 0.596124800 172.20.6.246 → 93.184.216.34 TCP 66 48792 → 80 [FIN, ACK] Seq=76 Ack=1613 Win=64128 Len=0 TSval=2331453811 TSecr=2186059510
    9 0.897600900 93.184.216.34 → 172.20.6.246 TCP 66 80 → 48792 [FIN, ACK] Seq=1613 Ack=77 Win=65536 Len=0 TSval=2186059824 TSecr=2331453811
   10 0.897661200 172.20.6.246 → 93.184.216.34 TCP 66 48792 → 80 [ACK] Seq=77 Ack=1614 Win=64128 Len=0 TSval=2331454112 TSecr=2186059824
```

###### outside LAN
```
    1   0.000000 172.254.99.38 → 93.184.216.34 TCP 74 50226 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1 TSval=2331453215 TSecr=0 WS=128
    2   0.282316 93.184.216.34 → 172.254.99.38 TCP 74 80 → 50226 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0 MSS=1452 SACK_PERM=1 TSval=2186059229 TSecr=2331453215 WS=512
    3   0.282631 172.254.99.38 → 93.184.216.34 TCP 66 50226 → 80 [ACK] Seq=1 Ack=1 Win=64256 Len=0 TSval=2331453497 TSecr=2186059229
    4   0.282709 172.254.99.38 → 93.184.216.34 HTTP 141 GET / HTTP/1.1
    5   0.589843 93.184.216.34 → 172.254.99.38 TCP 66 80 → 50226 [ACK] Seq=1 Ack=76 Win=65536 Len=0 TSval=2186059510 TSecr=2331453497
    6   0.589843 93.184.216.34 → 172.254.99.38 TCP 1506 HTTP/1.1 200 OK  [TCP segment of a reassembled PDU]
    7   0.589843 93.184.216.34 → 172.254.99.38 HTTP 238 HTTP/1.1 200 OK  (text/html)
    8   0.590248 172.254.99.38 → 93.184.216.34 TCP 66 50226 → 80 [ACK] Seq=76 Ack=1613 Win=64128 Len=0 TSval=2331453805 TSecr=2186059510
    9   0.596420 172.254.99.38 → 93.184.216.34 TCP 66 50226 → 80 [FIN, ACK] Seq=76 Ack=1613 Win=64128 Len=0 TSval=2331453811 TSecr=2186059510
   10   0.897279 93.184.216.34 → 172.254.99.38 TCP 66 80 → 50226 [FIN, ACK] Seq=1613 Ack=77 Win=65536 Len=0 TSval=2186059824 TSecr=2331453811
   11   0.897880 172.254.99.38 → 93.184.216.34 TCP 66 50226 → 80 [ACK] Seq=77 Ack=1614 Win=64128 Len=0 TSval=2331454112 TSecr=2186059824
   12  14.825406 172.254.99.38 → 117.18.237.29 TCP 54 60626 → 80 [FIN, ACK] Seq=1 Ack=1 Win=516 Len=0
   13  14.838097 117.18.237.29 → 172.254.99.38 TCP 60 80 → 60626 [FIN, ACK] Seq=1 Ack=2 Win=131 Len=0
   14  14.838241 172.254.99.38 → 117.18.237.29 TCP 54 60626 → 80 [ACK] Seq=2 Ack=2 Win=516 Len=0
```

#### 評価
NAPTはTCPコネクションを張らないようです．その場合NAPTして出ていくパケットに使用されるポート番号はただの識別子としてしか機能しないのでしょうか．
それともOSのプロトコルスタックでもバインドされるのでしょうか．
