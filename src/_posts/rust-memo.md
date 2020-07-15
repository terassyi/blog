---
title: Rust雑多メモ
date: 2020-06-16
description: Rustの機能や書き方で調べたことなどのメモ
draft: true
---

# Rust雑多メモ
こんにちは．最近は課題やらテストやらでなかなか自由な学習の時間が取れていません．スケジュール管理やタスク管理をしっかりして時間を上手に使いたいものです．
最近は趣味でRustをちょくちょく書いていますが高機能すぎて使い方を網羅できません．なので調べたことをメモします．

## Attribute
Attributeとはモジュール，クレート，要素に対するメタデータです．
- コンパイル時の条件分岐
- クレート名などの設定
- マクロなどの使用
- 外部ライブラリへのリンク
- テスト関数を明示
- ベンチマーク関数を明示
などの目的で使用されます．
よく使うのは`#[derive(Debug)]`や`#[test]`ですね．これらは上記のようにそれぞれその構造体にDebugクレートを自動で実装してくれたり，テスト関数であることを明示してくれます．

### #[inline]
今回僕が気になったのは`#[inline]`アトリビュートです．ちょくちょく見かけるんですが用途がいまいちわかりませんでした．公式ドキュメントをみてみると，
> The inline attribute suggests that a copy of the attributed function should be placed in the caller, rather than generating code to call the function where it is defined.
とあります．
つまり，inline属性がついた関数は定義した場所のコピーを呼び出しもとに置くべきということですかね．
コンパイル時の負荷の軽減やパフォーマンス向上のために使用されるっぽいです．

#### 参考
- [Attributes](https://doc.rust-lang.org/reference/attributes.html)
- [When should I use inline?](https://internals.rust-lang.org/t/when-should-i-use-inline/598)

## Copy Crateについて
