// فحص إمكانية subclassing SectionProperties لحقن bidi
import { Document, SectionProperties, XmlComponent, Packer } from "docx";
import { writeFileSync } from "fs";

class RtlSectionProperties extends SectionProperties {
  constructor(options: Parameters<typeof SectionProperties.prototype.constructor>[0]) {
    super(options);
    // addChildElement يقبل XmlComponent | string
    this.addChildElement(new OnOffCustom("w:bidi", true));
    this.addChildElement(new OnOffCustom("w:rtlGutter", true));
  }
}

class OnOffCustom extends XmlComponent {
  constructor(name: string, val?: boolean) {
    super(name);
    if (val) {
      (this as any).addChildElement("<w:" + name.replace("w:", "") + "/>");
    }
  }
}

// اختبار: هل addChildElement يقبل نص XML خام؟
const sp = new RtlSectionProperties({
  page: { margin: { top: 100, right: 100, bottom: 100, left: 100 } },
} as any);

// فحص الـ children بعد الحقن
const root = (sp as any).root ?? (sp as any);
console.log("sp type:", sp.constructor.name);
// XmlComponent يخزن العناصر في this.root (XmlComponent)؟ نفحص keys
console.log("sp own keys:", Object.keys(sp));

// اختبار packing كامل مع section properties مخصصة — لا يمكن تمريرها مباشرة في options
// Document constructor يقبل properties كـ object فقط، نبحث عن طريقة subclass
