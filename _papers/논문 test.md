---
title: "논문 test"

image: 
  path: /images/프로그래머스로고.jpeg
  thumbnail: /images/프로그래머스로고.jpeg
---

## Abstract

$\mathcal{X}=\mathbb{R}^d$ : input space 

$\mathcal{Y}= y \in \{0,1\}^M$ : output space(y is one-hot) M is number of classes, 
$\mathcal{D}=\{x_i, y_i\}^N_{i=1}$
$f_\theta=\{\eta_{\theta_e}(.),g_{\theta_c}(.)\}$ : prediction network

$\breve{y_i}=s_{\theta_{cce}}(\psi_i)$ latent으로든, concept으로든 예측할 때 차이가 없어야 한다.(informative)