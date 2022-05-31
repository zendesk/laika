"use strict";(self.webpackChunk_zendesk_laika_docs=self.webpackChunk_zendesk_laika_docs||[]).push([[826],{3905:function(e,a,t){t.d(a,{Zo:function(){return c},kt:function(){return d}});var n=t(7294);function i(e,a,t){return a in e?Object.defineProperty(e,a,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[a]=t,e}function r(e,a){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);a&&(n=n.filter((function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable}))),t.push.apply(t,n)}return t}function l(e){for(var a=1;a<arguments.length;a++){var t=null!=arguments[a]?arguments[a]:{};a%2?r(Object(t),!0).forEach((function(a){i(e,a,t[a])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):r(Object(t)).forEach((function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(t,a))}))}return e}function o(e,a){if(null==e)return{};var t,n,i=function(e,a){if(null==e)return{};var t,n,i={},r=Object.keys(e);for(n=0;n<r.length;n++)t=r[n],a.indexOf(t)>=0||(i[t]=e[t]);return i}(e,a);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(n=0;n<r.length;n++)t=r[n],a.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(i[t]=e[t])}return i}var p=n.createContext({}),s=function(e){var a=n.useContext(p),t=a;return e&&(t="function"==typeof e?e(a):l(l({},a),e)),t},c=function(e){var a=s(e.components);return n.createElement(p.Provider,{value:a},e.children)},u={inlineCode:"code",wrapper:function(e){var a=e.children;return n.createElement(n.Fragment,{},a)}},k=n.forwardRef((function(e,a){var t=e.components,i=e.mdxType,r=e.originalType,p=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),k=s(t),d=i,m=k["".concat(p,".").concat(d)]||k[d]||u[d]||r;return t?n.createElement(m,l(l({ref:a},c),{},{components:t})):n.createElement(m,l({ref:a},c))}));function d(e,a){var t=arguments,i=a&&a.mdxType;if("string"==typeof e||i){var r=t.length,l=new Array(r);l[0]=k;var o={};for(var p in a)hasOwnProperty.call(a,p)&&(o[p]=a[p]);o.originalType=e,o.mdxType="string"==typeof e?e:i,l[1]=o;for(var s=2;s<r;s++)l[s]=t[s];return n.createElement.apply(null,l)}return n.createElement.apply(null,t)}k.displayName="MDXCreateElement"},8996:function(e,a,t){t.r(a),t.d(a,{assets:function(){return c},contentTitle:function(){return p},default:function(){return d},frontMatter:function(){return o},metadata:function(){return s},toc:function(){return u}});var n=t(3117),i=t(102),r=(t(7294),t(3905)),l=["components"],o={id:"Laika",title:"Module: Laika",sidebar_label:"Laika",sidebar_position:0,custom_edit_url:null},p=void 0,s={unversionedId:"api/modules/Laika",id:"api/modules/Laika",title:"Module: Laika",description:"Laika is the place where most of the magic happens.",source:"@site/docs/api/modules/Laika.md",sourceDirName:"api/modules",slug:"/api/modules/Laika",permalink:"/laika/docs/api/modules/Laika",draft:!1,editUrl:null,tags:[],version:"current",sidebarPosition:0,frontMatter:{id:"Laika",title:"Module: Laika",sidebar_label:"Laika",sidebar_position:0,custom_edit_url:null},sidebar:"default",previous:{title:"How to install in your project",permalink:"/laika/docs/how-to-install"},next:{title:"Usage in Cypress",permalink:"/laika/docs/usage-in-cypress"}},c={},u=[{value:"Classes",id:"classes",level:2}],k={toc:u};function d(e){var a=e.components,t=(0,i.Z)(e,l);return(0,r.kt)("wrapper",(0,n.Z)({},k,t,{components:a,mdxType:"MDXLayout"}),(0,r.kt)("p",null,(0,r.kt)("a",{parentName:"p",href:"/laika/docs/api/classes/Laika.Laika-1"},(0,r.kt)("inlineCode",{parentName:"a"},"Laika"))," is the place where most of the magic happens.\nAll the operations are routed through its Apollo Link, and Laika can decide what happens to them along the way.\nBy default every connection is passed through and no additional action is taken."),(0,r.kt)("p",null,"If you're using createGlobalLaikaLink, an instance of Laika is by default installed as ",(0,r.kt)("inlineCode",{parentName:"p"},"laika")," property\non the global object (most likely ",(0,r.kt)("inlineCode",{parentName:"p"},"window"),"), accessible as ",(0,r.kt)("inlineCode",{parentName:"p"},"window.laika"),"\nor simply as ",(0,r.kt)("inlineCode",{parentName:"p"},"laika"),"."),(0,r.kt)("p",null,"Key functionality:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("p",{parentName:"li"},(0,r.kt)("a",{parentName:"p",href:"/laika/docs/api/classes/Laika.Laika-1#intercept"},(0,r.kt)("inlineCode",{parentName:"a"},"laika.intercept()")),":"),(0,r.kt)("p",{parentName:"li"},"If you use ",(0,r.kt)("inlineCode",{parentName:"p"},"jest"),", you can think of laika like the ",(0,r.kt)("inlineCode",{parentName:"p"},"jest")," global,\nwhere the equivalent of ",(0,r.kt)("inlineCode",{parentName:"p"},"jest.fn()")," is ",(0,r.kt)("a",{parentName:"p",href:"/laika/docs/api/classes/Laika.Laika-1#intercept"},(0,r.kt)("inlineCode",{parentName:"a"},"laika.intercept()")))),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("p",{parentName:"li"},(0,r.kt)("a",{parentName:"p",href:"/laika/docs/api/classes/Laika.LogApi"},(0,r.kt)("inlineCode",{parentName:"a"},"laika.log"))),(0,r.kt)("p",{parentName:"li"},"The other thing laika is responsible for is logging."),(0,r.kt)("p",{parentName:"li"},"Logging functionality is behind a separate API available under ",(0,r.kt)("a",{parentName:"p",href:"/laika/docs/api/classes/Laika.LogApi"},(0,r.kt)("inlineCode",{parentName:"a"},"laika.log")),"."))),(0,r.kt)("h2",{id:"classes"},"Classes"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/laika/docs/api/classes/Laika.InterceptApi"},"InterceptApi")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/laika/docs/api/classes/Laika.Laika-1"},"Laika")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"/laika/docs/api/classes/Laika.LogApi"},"LogApi"))))}d.isMDXComponent=!0}}]);