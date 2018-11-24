/// <reference path="../../../Field.ts" />
/// <reference path="../../JiraSelectField.ts" />
/// <reference path="../../../../../definitions/common.d.ts" />
/// <reference path="../../../../../definitions/bluebird.d.ts" />
/// <reference path="../../../getter/GetTextValue.ts" />
/// <reference path="../../../setter/SetOptionValue.ts" />

interface TempoAccount {
    id: number;
    key: string;
    name: string;
    global: boolean;
    contactAvatar?: string;
    status?: 'CLOSED' | 'OPEN' | 'ARCHIVED';
    lead?: JiraUser;
    leadAvatar?: string;
}

@getter(GetterType.Text)
@setter(SetterType.Option)
class TempoCloudAccountField extends JiraSelectField {


}