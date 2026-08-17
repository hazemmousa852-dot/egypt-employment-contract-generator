// البرهان النهائي: إنشاء RtlSectionProperties وتجاوز Document constructor ليقبلها
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  SectionProperties,
  XmlComponent,
  AlignmentType,
} from "docx";
import { writeFileSync, execSync } from "fs";

class RtlSectionProperties extends SectionProperties {
  constructor(options: ConstructorParameters<typeof SectionProperties>[0]) {
    super(options);
    const bidi = new (class extends XmlComponent {
      constructor() {
        super("w:bidi");
      }
    })();
    const rtlGutter = new (class extends XmlComponent {
      constructor() {
        super("w:rtlGutter");
      }
    })();
    // addChildElement(string) مدعوم في XmlComponent: يقبل XmlComponent | string
    (this as any).addChildElement(bidi);
    (this as any).addChildElement(rtlGutter);
  }
}

// طريقة التجاوز: Document constructor يبني SectionProperties من options.
// الحل: بعد الإنشاء نستبدل الـ SectionProperties في documentWrapper عبر documentWrapper?
// الأسهل: Document ليس له API عام للوصول للـ section، لكن يمكن الوصول عبر:
// (doc as any).documentWrapper? — لا. جربنا: Document has 'Sections'؟ لا.
// الحل العملي: تمرير properties كـ RtlSectionProperties مباشرة؟ لا يقبل.
// الحل الأقوى: تعديل XML الناتج: فك zip وتعديل word/document.xml وadd sectPr bidi.
// سنولّد docx عاديًا ثم نعدل XML — سنبرهن ذلك هنا:

const doc = new Document({
  sections: [
    {
      properties: { page: { margin: { top: 100, right: 100, bottom: 100, left: 100 } } },
      children: [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "اختبار اتجاه النص من اليمين", rightToLeft: true })],
        }),
      ],
    },
  ],
});

const blob = await Packer.toBlob(doc);
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync("/tmp/probe3.docx", buf);
console.log("written", buf.length);
