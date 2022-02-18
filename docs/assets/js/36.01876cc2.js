(window.webpackJsonp=window.webpackJsonp||[]).push([[36],{304:function(n,s,t){"use strict";t.r(s);var a=t(1),e=Object(a.a)({},(function(){var n=this,s=n.$createElement,t=n._self._c||s;return t("ContentSlotsDistributor",{attrs:{"slot-key":n.$parent.slotKey}},[t("p",[n._v("こんにちは．大学院の後期授業も開始され，さらに多数イベントが同時並行で開催されており非常に忙しい日々を過ごしています．最近は将棋の勉強にも精を出しています．弱いですが．\n今回はXDPが実行できるVMをVagrantで作ります．\n先日"),t("a",{attrs:{href:"https://terassyi.net/posts/2020/09/12/pepabo-intern.html",target:"_blank",rel:"noopener noreferrer"}},[n._v("GMOペパボさんのeBPFインターンシップ"),t("OutboundLink")],1),n._v("に参加させていただいて以降eBPF関連の技術に興味を持っておりXDPに手を出してみます．")]),n._v(" "),t("h2",{attrs:{id:"xdpとは"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#xdpとは"}},[n._v("#")]),n._v(" XDPとは")]),n._v(" "),t("p",[t("code",[n._v("XDP")]),n._v("とは"),t("code",[n._v("eXpress Data Pass")]),n._v("の略で高速にパケット処理を行うことのできるLinuxカーネルの機能です(語彙力)．\n私自身まだ入門もしていないので詳しい説明は別の記事にまかせます．")]),n._v(" "),t("ul",[t("li",[t("a",{attrs:{href:"http://yunazuno.hatenablog.com/entry/2016/10/11/090245",target:"_blank",rel:"noopener noreferrer"}},[n._v("Linuxカーネルの新機能 XDP (eXpress Data Path) を触ってみる"),t("OutboundLink")],1)])]),n._v(" "),t("h2",{attrs:{id:"xdpに対応したvmを探して"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#xdpに対応したvmを探して"}},[n._v("#")]),n._v(" XDPに対応したVMを探して")]),n._v(" "),t("p",[t("code",[n._v("xdp vagrant")]),n._v("などで検索すると"),t("a",{attrs:{href:"https://github.com/iovisor/xdp-vagrant",target:"_blank",rel:"noopener noreferrer"}},[n._v("github.com/iovisor/xdp-vagrant"),t("OutboundLink")],1),n._v("こちらのリポジトリに当たりますがこちらのVMは依存関係が解決できずうまくサンプルを実行できませんでした．さらに"),t("a",{attrs:{href:"https://github.com/xdp-project/xdp-tutorial",target:"_blank",rel:"noopener noreferrer"}},[n._v("github.com/xdp-project/xdp-tutorial"),t("OutboundLink")],1),n._v("が見つかりますがこちらもbasic02あたりからつまずきます．そのほかいろいろネットを徘徊してみましたがいいものが見つかりません．")]),n._v(" "),t("h3",{attrs:{id:"ないので作る"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#ないので作る"}},[n._v("#")]),n._v(" ないので作る")]),n._v(" "),t("p",[n._v("適切なものが見つからないので作ることにしました．作るといってもベースは先ほどの"),t("a",{attrs:{href:"https://github.com/iovisor/xdp-vagrant",target:"_blank",rel:"noopener noreferrer"}},[n._v("github.com/iovisor/xdp-vagrant"),t("OutboundLink")],1),n._v("を流用させていただきました．使用するboxを"),t("code",[n._v("generic/ubuntu2004")]),n._v("に変更しています．")]),n._v(" "),t("p",[n._v("作ったVagrantfileは"),t("a",{attrs:{href:"https://gist.github.com/terassyi/41937fb488361c3aeb75425de07426f8",target:"_blank",rel:"noopener noreferrer"}},[n._v("こちらのgist"),t("OutboundLink")],1),n._v("においてます．")]),n._v(" "),t("ul",[t("li",[n._v("Vagrantfile\nポイントは"),t("code",[n._v('libvirt.nic_model_type = "e1000"')]),n._v("です．XDPに対応したNICを選択する必要がありますね．"),t("div",{staticClass:"language- line-numbers-mode"},[t("pre",{pre:!0,attrs:{class:"language-text"}},[t("code",[n._v('[\'vagrant-reload\'].each do |plugin|\nunless Vagrant.has_plugin?(plugin)\n    raise "Vagrant plugin #{plugin} is not installed!"\nend\nend\n\nVagrant.configure(\'2\') do |config|\nconfig.vm.box = "generic/ubuntu2004" # Ubuntu\nconfig.vm.network "private_network", ip: "192.168.50.4"\n\n# fix issues with slow dns https://www.virtualbox.org/ticket/13002\nconfig.vm.provider :libvirt do |libvirt|\n    libvirt.connect_via_ssh = false\n    libvirt.memory = 1024\n    libvirt.cpus = 2\n    libvirt.nic_model_type = "e1000"\nend\nconfig.vm.synced_folder "./", "/home/vagrant/work"\nconfig.vm.provision :shell, :privileged => true, :path => "setup.sh"\nend\n')])]),n._v(" "),t("div",{staticClass:"line-numbers-wrapper"},[t("span",{staticClass:"line-number"},[n._v("1")]),t("br"),t("span",{staticClass:"line-number"},[n._v("2")]),t("br"),t("span",{staticClass:"line-number"},[n._v("3")]),t("br"),t("span",{staticClass:"line-number"},[n._v("4")]),t("br"),t("span",{staticClass:"line-number"},[n._v("5")]),t("br"),t("span",{staticClass:"line-number"},[n._v("6")]),t("br"),t("span",{staticClass:"line-number"},[n._v("7")]),t("br"),t("span",{staticClass:"line-number"},[n._v("8")]),t("br"),t("span",{staticClass:"line-number"},[n._v("9")]),t("br"),t("span",{staticClass:"line-number"},[n._v("10")]),t("br"),t("span",{staticClass:"line-number"},[n._v("11")]),t("br"),t("span",{staticClass:"line-number"},[n._v("12")]),t("br"),t("span",{staticClass:"line-number"},[n._v("13")]),t("br"),t("span",{staticClass:"line-number"},[n._v("14")]),t("br"),t("span",{staticClass:"line-number"},[n._v("15")]),t("br"),t("span",{staticClass:"line-number"},[n._v("16")]),t("br"),t("span",{staticClass:"line-number"},[n._v("17")]),t("br"),t("span",{staticClass:"line-number"},[n._v("18")]),t("br"),t("span",{staticClass:"line-number"},[n._v("19")]),t("br"),t("span",{staticClass:"line-number"},[n._v("20")]),t("br")])])]),n._v(" "),t("li",[n._v("setup.sh\nvmの起動時に実行されるスクリプトです．xdpのコードをビルドするためのソフト類を入れています．こちらのファイルは"),t("a",{attrs:{href:"https://github.com/iovisor/bcc/blob/master/INSTALL.md",target:"_blank",rel:"noopener noreferrer"}},[n._v("bcc python tutorial"),t("OutboundLink")],1),n._v("を元に作成しています．"),t("div",{staticClass:"language-shell line-numbers-mode"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[t("span",{pre:!0,attrs:{class:"token shebang important"}},[n._v("#!/bin/bash")]),n._v("\n\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("sudo")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("apt")]),n._v(" update -y\n\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("sudo")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("apt")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("install")]),n._v(" -y bison build-essential cmake flex "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("git")]),n._v(" libedit-dev "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[n._v("\\")]),n._v("\nlibllvm7 llvm-7-dev libclang-7-dev python zlib1g-dev libelf-dev "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[n._v("\\")]),n._v("\npython3-distutils clang\n\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("git")]),n._v(" clone https://github.com/iovisor/bcc.git\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("mkdir")]),n._v(" bcc/build"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[n._v(";")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token builtin class-name"}},[n._v("cd")]),n._v(" bcc/build\ncmake "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[n._v("..")]),n._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("make")]),n._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("sudo")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("make")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("install")]),n._v("\ncmake -DPYTHON_CMD"),t("span",{pre:!0,attrs:{class:"token operator"}},[n._v("=")]),n._v("python3 "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[n._v("..")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token comment"}},[n._v("# build python3 binding")]),n._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("pushd")]),n._v(" src/python/\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("make")]),n._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("sudo")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("make")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("install")]),n._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("popd")]),n._v("\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[n._v("# install golang")]),n._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("wget")]),n._v(" https://golang.org/dl/go1.15.3.linux-amd64.tar.gz\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("sudo")]),n._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("tar")]),n._v(" -C /usr/local -xzf go1.15.3.linux-amd64.tar.gz\n"),t("span",{pre:!0,attrs:{class:"token function"}},[n._v("rm")]),n._v(" -rf go1.15.3.linux-amd64.tar.gz\n")])]),n._v(" "),t("div",{staticClass:"line-numbers-wrapper"},[t("span",{staticClass:"line-number"},[n._v("1")]),t("br"),t("span",{staticClass:"line-number"},[n._v("2")]),t("br"),t("span",{staticClass:"line-number"},[n._v("3")]),t("br"),t("span",{staticClass:"line-number"},[n._v("4")]),t("br"),t("span",{staticClass:"line-number"},[n._v("5")]),t("br"),t("span",{staticClass:"line-number"},[n._v("6")]),t("br"),t("span",{staticClass:"line-number"},[n._v("7")]),t("br"),t("span",{staticClass:"line-number"},[n._v("8")]),t("br"),t("span",{staticClass:"line-number"},[n._v("9")]),t("br"),t("span",{staticClass:"line-number"},[n._v("10")]),t("br"),t("span",{staticClass:"line-number"},[n._v("11")]),t("br"),t("span",{staticClass:"line-number"},[n._v("12")]),t("br"),t("span",{staticClass:"line-number"},[n._v("13")]),t("br"),t("span",{staticClass:"line-number"},[n._v("14")]),t("br"),t("span",{staticClass:"line-number"},[n._v("15")]),t("br"),t("span",{staticClass:"line-number"},[n._v("16")]),t("br"),t("span",{staticClass:"line-number"},[n._v("17")]),t("br"),t("span",{staticClass:"line-number"},[n._v("18")]),t("br"),t("span",{staticClass:"line-number"},[n._v("19")]),t("br"),t("span",{staticClass:"line-number"},[n._v("20")]),t("br"),t("span",{staticClass:"line-number"},[n._v("21")]),t("br"),t("span",{staticClass:"line-number"},[n._v("22")]),t("br"),t("span",{staticClass:"line-number"},[n._v("23")]),t("br")])])])]),n._v(" "),t("h3",{attrs:{id:"実行"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#実行"}},[n._v("#")]),n._v(" 実行")]),n._v(" "),t("div",{staticClass:"language- line-numbers-mode"},[t("pre",{pre:!0,attrs:{class:"language-text"}},[t("code",[n._v("$ vagrant init generic/ubuntu2004\n")])]),n._v(" "),t("div",{staticClass:"line-numbers-wrapper"},[t("span",{staticClass:"line-number"},[n._v("1")]),t("br")])]),t("p",[n._v("した後，")]),n._v(" "),t("div",{staticClass:"language- line-numbers-mode"},[t("pre",{pre:!0,attrs:{class:"language-text"}},[t("code",[n._v("$ vagrant up\n")])]),n._v(" "),t("div",{staticClass:"line-numbers-wrapper"},[t("span",{staticClass:"line-number"},[n._v("1")]),t("br")])]),t("p",[n._v("で起動して")]),n._v(" "),t("div",{staticClass:"language- line-numbers-mode"},[t("pre",{pre:!0,attrs:{class:"language-text"}},[t("code",[n._v("$ vagrant ssh\n")])]),n._v(" "),t("div",{staticClass:"line-numbers-wrapper"},[t("span",{staticClass:"line-number"},[n._v("1")]),t("br")])]),t("p",[n._v("でVMに接続します．")]),n._v(" "),t("h2",{attrs:{id:"まとめ"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#まとめ"}},[n._v("#")]),n._v(" まとめ")]),n._v(" "),t("p",[n._v("カーネルのバージョンやpythonの依存関係に悩まされましたがこれでやっとXDPに入門することができます．\nXDP使ってみた系の資料はまだ少ないのでブログ書きたいと思います．")])])}),[],!1,null,null,null);s.default=e.exports}}]);