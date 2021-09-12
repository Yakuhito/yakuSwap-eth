# yakuSwap-eth

Gas consumption (estimate):

```
·------------------------------|---------------------------|-------------|-----------------------------·
|     Solc version: 0.8.7      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
·······························|···························|·············|······························
|  Methods                     ·              100 gwei/gas               ·       3406.79 usd/eth       │
··············|················|·············|·············|·············|···············|··············
|  Contract   ·  Method        ·  Min        ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
··············|················|·············|·············|·············|···············|··············
|  TestToken  ·  approve       ·      46239  ·      46251  ·      46250  ·           12  ·      15.76  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  cancelSwap    ·          -  ·          -  ·      41126  ·            2  ·      14.01  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  completeSwap  ·      87304  ·      87316  ·      87312  ·            6  ·      29.75  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  createSwap    ·      85628  ·      85640  ·      85639  ·           24  ·      29.18  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  withdrawFees  ·      37507  ·      53407  ·      48107  ·            3  ·      16.39  │
··············|················|·············|·············|·············|···············|··············
|  Deployments                 ·                                         ·  % of limit   ·             │
·······························|·············|·············|·············|···············|··············
|  TestToken                   ·          -  ·          -  ·     641308  ·        2.1 %  ·     218.48  │
·······························|·············|·············|·············|···············|··············
|  YakuSwap                    ·          -  ·          -  ·     932806  ·        3.1 %  ·     317.79  │
·------------------------------|-------------|-------------|-------------|---------------|-------------·
```

License
=======
    Copyright 2021 Mihai Dancaescu

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
