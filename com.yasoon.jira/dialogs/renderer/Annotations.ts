import { GetterType, SetterType } from './Enumerations';
import { Field } from './Field';

//@getter Annotation
export function getter(getterType: GetterType, ...params: any[]) {
    return function (target) {
        let proto: Field = target.prototype;
        switch (getterType) {
            case GetterType.Text:
                proto.getter = new GetTextValue();
                break;

            case GetterType.Object:
                proto.getter = new GetObject(params[0]);
                break;

            case GetterType.ObjectArray:
                proto.getter = new GetObjectArray(params[0]);
                break;

            case GetterType.Array:
                proto.getter = new GetArray();
                break;

            case GetterType.Option:
                proto.getter = new GetOption(params[0], params[1]);
                break;
        }
    }
}

//@setter Annotation
export function setter(setterType: SetterType) {
    return function (target) {
        let proto: Field = target.prototype;
        switch (setterType) {
            case SetterType.Text:
                proto.setter = new SetValue();
                break;

            case SetterType.CheckedValues:
                proto.setter = new SetCheckedValues();
                break;

            case SetterType.Date:
                proto.setter = new SetDateValue();
                break;

            case SetterType.DateTime:
                proto.setter = new SetDateTimeValue();
                break;

            case SetterType.Option:
                proto.setter = new SetOptionValue();
                break;
            case SetterType.Tag:
                proto.setter = new SetTagValue();
                break;
        }
    }
}