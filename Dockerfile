FROM selenium/node-chrome:latest@sha256:0aec4c38431c386877888c612a9340b1132bbeb4dc4af5b5ff54b9310e48e5a1

USER root

RUN apt-get update -qqy \
  && apt-get install -y git \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/* \
  && rm /bin/sh && ln -s /bin/bash /bin/sh \
  && chown seluser /usr/local

ENV NVM_DIR /usr/local/nvm
RUN wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash \
  && source $NVM_DIR/nvm.sh \
  && nvm install v8

ENV CHROME_BIN /opt/google/chrome/chrome
ENV INSIDE_DOCKER=1

WORKDIR /usr/src
ENTRYPOINT source $NVM_DIR/nvm.sh && npm i && npm test
