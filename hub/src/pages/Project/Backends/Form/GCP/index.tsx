import React, { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
    FileUploader,
    FormMultiselect,
    FormMultiselectOptions,
    FormS3BucketSelector,
    FormSelect,
    FormSelectOptions,
    InfoLink,
    SpaceBetween,
    Spinner,
} from 'components';

import { useHelpPanel, useNotifications } from 'hooks';
import useIsMounted from 'hooks/useIsMounted';
import { isRequestFormErrors2, isRequestFormFieldError } from 'libs';
import { useBackendValuesMutation } from 'services/backend';
import { GCPCredentialTypeEnum } from 'types';

import {
    ADDITIONAL_REGIONS_HELP,
    AREA_HELP,
    BUCKET_HELP,
    FIELD_NAMES,
    REGION_HELP,
    SERVICE_ACCOUNT_HELP,
    SUBNET_HELP,
    ZONE_HELP,
} from './constants';

import { IProps, VPCSubnetOption } from './types';

import styles from './styles.module.scss';

const FIELDS_QUEUE = [
    FIELD_NAMES.CREDENTIALS.TYPE,
    FIELD_NAMES.CREDENTIALS.DATA,
    FIELD_NAMES.AREA,
    FIELD_NAMES.REGION,
    FIELD_NAMES.ZONE,
    FIELD_NAMES.BUCKET_NAME,
    FIELD_NAMES.VPC_SUBNET,
    FIELD_NAMES.VPC,
    FIELD_NAMES.SUBNET,
];
export const GCPBackend: React.FC<IProps> = ({ loading }) => {
    const { t } = useTranslation();
    const {
        control,
        setValue,
        getValues,
        setError,
        clearErrors,
        watch,
        formState: { errors },
    } = useFormContext();
    const [files, setFiles] = useState<File[]>([]);
    const [valuesData, setValuesData] = useState<IGCPBackendValues | undefined>();
    const [areaOptions, setAreaOptions] = useState<FormSelectOptions>([]);
    const [regionOptions, setRegionOptions] = useState<FormSelectOptions>([]);
    const [zoneOptions, setZoneOptions] = useState<FormSelectOptions>([]);
    const [bucketNameOptions, setBucketNameOptions] = useState<TAwsBucket[]>([]);
    const [subnetOptions, setSubnetOptions] = useState<VPCSubnetOption[]>([]);
    const [extraRegions, setExtraRegions] = useState<FormMultiselectOptions>([]);
    const [availableDefaultCredentials, setAvailableDefaultCredentials] = useState<boolean | null>(null);
    const requestRef = useRef<null | ReturnType<typeof getBackendValues>>(null);
    const [pushNotification] = useNotifications();
    const lastUpdatedField = useRef<string | null>(null);
    const isFirstRender = useRef<boolean>(true);
    const isMounted = useIsMounted();

    const [getBackendValues, { isLoading: isLoadingValues }] = useBackendValuesMutation();
    const backendCredentialTypeValue = watch(FIELD_NAMES.CREDENTIALS.TYPE);
    const backendCredentials = watch(FIELD_NAMES.CREDENTIALS.DATA);

    const [openHelpPanel] = useHelpPanel();

    const changeFormHandler = async () => {
        const formValues = getValues();

        if (formValues?.credentials?.type === GCPCredentialTypeEnum.SERVICE_ACCOUNT && !formValues?.credentials?.data) {
            return;
        }

        if (formValues?.credentials && !formValues.credentials?.type) delete formValues.credentials;

        clearErrors();

        try {
            const request = getBackendValues(formValues);
            requestRef.current = request;
            const response = await request.unwrap();

            if (!isMounted()) return;

            setValuesData(response);

            lastUpdatedField.current = null;

            setAvailableDefaultCredentials(response.default_credentials);
            // If default credentials unavailable, set selected client credential option
            if (!formValues?.credentials?.type && !response.default_credentials) {
                setValue(FIELD_NAMES.CREDENTIALS.TYPE, GCPCredentialTypeEnum.SERVICE_ACCOUNT);
            }

            // select authorization option
            if (!formValues?.credentials?.type) {
                setValue(
                    FIELD_NAMES.CREDENTIALS.TYPE,
                    response.default_credentials ? GCPCredentialTypeEnum.DEFAULT : GCPCredentialTypeEnum.SERVICE_ACCOUNT,
                );

                if (response.default_credentials) changeFormHandler().catch(console.log);
            }

            if (response.area?.values) {
                setAreaOptions(response.area.values);
            }

            if (response.area?.selected !== undefined) {
                setValue(FIELD_NAMES.AREA, response.area.selected);
            }

            if (response.region?.values) {
                setRegionOptions(response.region.values);
            }

            if (response.region?.selected !== undefined) {
                setValue(FIELD_NAMES.REGION, response.region.selected);
            }

            if (response.zone?.values) {
                setZoneOptions(response.zone.values);
            }

            if (response.zone?.selected !== undefined) {
                setValue(FIELD_NAMES.ZONE, response.zone.selected);
            }

            if (response.bucket_name?.values) {
                const buckets: TAwsBucket[] = response.bucket_name.values.map((valueItem) => ({
                    name: valueItem.value,
                }));

                setBucketNameOptions(buckets);
            }

            if (response.bucket_name?.selected !== undefined) {
                setValue(FIELD_NAMES.BUCKET_NAME, response.bucket_name.selected);
            }

            if (response.vpc_subnet?.values) {
                // it needs for working form, because options from api doesn't have value property
                const vpcSubnetOptions: VPCSubnetOption[] = response.vpc_subnet.values.map((i) => ({
                    ...i,
                    value: i.label,
                }));

                setSubnetOptions(vpcSubnetOptions);
            }

            if (response.vpc_subnet?.selected !== undefined) {
                setValue(FIELD_NAMES.VPC_SUBNET, response.vpc_subnet.selected);

                const valueItem = response.vpc_subnet.values.find((i) => i.label === response.vpc_subnet?.selected);

                if (!valueItem) return;

                setVPCSubnetFormValue({
                    vpc: valueItem.vpc,
                    subnet: valueItem.subnet,
                });
            }

            if (response.extra_regions?.values) {
                setExtraRegions(response.extra_regions.values);
            }

            if (response.extra_regions?.selected !== undefined) {
                setValue(FIELD_NAMES.EXTRA_REGIONS, response.extra_regions.selected);
            }
        } catch (errorResponse) {
            console.log('fetch backends values error:', errorResponse);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const errorRequestData = errorResponse?.data;

            if (isRequestFormErrors2(errorRequestData)) {
                errorRequestData.detail.forEach((error) => {
                    if (isRequestFormFieldError(error)) {
                        if (error.loc.length === 1 && error.loc[0] === 'credentials') {
                            setError(FIELD_NAMES.CREDENTIALS.TYPE, { type: 'custom', message: error.msg });
                        } else {
                            setError(error.loc.join('.'), { type: 'custom', message: error.msg });
                        }
                    } else {
                        pushNotification({
                            type: 'error',
                            content: t('common.server_error', { error: error?.msg }),
                        });
                    }
                });
            }
        }
    };

    useEffect(() => {
        if (!isFirstRender.current) return;

        changeFormHandler().catch(console.log);
        isFirstRender.current = false;

        const fileName = getValues(FIELD_NAMES.CREDENTIALS.FILENAME);

        if (fileName) {
            const file = new File([''], fileName, { type: 'text/plain' });
            setFiles([file]);
        }
    }, []);

    const onChangeFormField = () => {
        if (requestRef.current) requestRef.current.abort();
        changeFormHandler().catch(console.log);
    };

    const clearFieldByQueueFromField = (name: string) => {
        const startIndex = FIELDS_QUEUE.findIndex((i) => i === name);

        if (startIndex < 0) return;

        for (let i = startIndex + 1; i < FIELDS_QUEUE.length; i++) {
            setValue(FIELDS_QUEUE[i], null);
        }
    };

    const getOnChangeSelectFormField = (fieldName: string) => () => {
        lastUpdatedField.current = fieldName;
        clearFieldByQueueFromField(fieldName);
        onChangeFormField();
    };

    const setVPCSubnetFormValue = ({ vpc, subnet }: { vpc: string; subnet: string }) => {
        setValue(FIELD_NAMES.VPC, vpc);
        setValue(FIELD_NAMES.SUBNET, subnet);
    };

    const onChangeVPCSubnet = () => {
        const vpcSubnet = getValues(FIELD_NAMES.VPC_SUBNET);

        if (!vpcSubnet) return;

        const optionItem = subnetOptions.find((i) => i.value === vpcSubnet);

        if (!optionItem) return;

        setVPCSubnetFormValue({
            vpc: optionItem.vpc,
            subnet: optionItem.subnet,
        });
    };

    const getDisabledByFieldName = (fieldName: string) => {
        let disabledField = loading || !backendCredentialTypeValue || !valuesData;

        disabledField =
            disabledField || (backendCredentialTypeValue === GCPCredentialTypeEnum.SERVICE_ACCOUNT && !backendCredentials);

        disabledField = disabledField || (lastUpdatedField.current !== fieldName && isLoadingValues);

        switch (fieldName) {
            case FIELD_NAMES.AREA:
                disabledField = disabledField || !areaOptions.length;
                break;
            case FIELD_NAMES.REGION:
                disabledField = disabledField || !regionOptions.length;
                break;
            case FIELD_NAMES.ZONE:
                disabledField = disabledField || !zoneOptions.length;
                break;
            case FIELD_NAMES.VPC_SUBNET:
                disabledField = disabledField || !subnetOptions.length;
                break;
        }

        return disabledField;
    };

    const renderSpinner = (force?: boolean) => {
        if (isLoadingValues || force)
            return (
                <div className={styles.fieldSpinner}>
                    <Spinner />
                </div>
            );
    };

    return (
        <>
            <SpaceBetween size="l">
                <FormSelect
                    label={t('projects.edit.gcp.authorization')}
                    control={control}
                    name={FIELD_NAMES.CREDENTIALS.TYPE}
                    onChange={onChangeFormField}
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    errorText={errors?.credentials?.message}
                    disabled={loading || availableDefaultCredentials === null}
                    secondaryControl={availableDefaultCredentials === null && renderSpinner(true)}
                    options={[
                        {
                            label: t('projects.edit.gcp.authorization_default'),
                            value: GCPCredentialTypeEnum.DEFAULT,
                            disabled: !availableDefaultCredentials,
                        },
                        {
                            label: t('projects.edit.gcp.service_account'),
                            value: GCPCredentialTypeEnum.SERVICE_ACCOUNT,
                        },
                    ]}
                />

                {backendCredentialTypeValue === GCPCredentialTypeEnum.SERVICE_ACCOUNT && (
                    <FileUploader
                        info={<InfoLink onFollow={() => openHelpPanel(SERVICE_ACCOUNT_HELP)} />}
                        fileInputId="gcp-credentials"
                        text="Choose a file"
                        description="Upload a service account key JSON file"
                        label={t('projects.edit.gcp.service_account')}
                        accept="application/json"
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        errorText={errors?.credentials?.data?.message}
                        files={files}
                        onFilesUploaded={(uploadedFiles) => {
                            if (uploadedFiles.length) {
                                setFiles([...uploadedFiles]);

                                const [file] = uploadedFiles;

                                const reader = new FileReader();
                                reader.onload = function () {
                                    const text = reader.result;
                                    if (text) {
                                        setValue(FIELD_NAMES.CREDENTIALS.DATA, text);
                                        setValue(FIELD_NAMES.CREDENTIALS.FILENAME, file.name);
                                        onChangeFormField();
                                    }
                                };

                                reader.readAsText(file);
                            }
                        }}
                    />
                )}

                <FormSelect
                    info={<InfoLink onFollow={() => openHelpPanel(AREA_HELP)} />}
                    label={t('projects.edit.gcp.area')}
                    description={t('projects.edit.gcp.area_description')}
                    placeholder={t('projects.edit.gcp.area_placeholder')}
                    control={control}
                    name={FIELD_NAMES.AREA}
                    options={areaOptions}
                    onChange={getOnChangeSelectFormField(FIELD_NAMES.AREA)}
                    disabled={getDisabledByFieldName(FIELD_NAMES.AREA)}
                    rules={{ required: t('validation.required') }}
                    secondaryControl={renderSpinner()}
                />

                <FormSelect
                    info={<InfoLink onFollow={() => openHelpPanel(REGION_HELP)} />}
                    label={t('projects.edit.gcp.region')}
                    description={t('projects.edit.gcp.region_description')}
                    placeholder={t('projects.edit.gcp.region_placeholder')}
                    control={control}
                    name={FIELD_NAMES.REGION}
                    options={regionOptions}
                    onChange={getOnChangeSelectFormField(FIELD_NAMES.REGION)}
                    disabled={getDisabledByFieldName(FIELD_NAMES.REGION)}
                    rules={{ required: t('validation.required') }}
                    secondaryControl={renderSpinner()}
                />

                <FormSelect
                    info={<InfoLink onFollow={() => openHelpPanel(ZONE_HELP)} />}
                    label={t('projects.edit.gcp.zone')}
                    description={t('projects.edit.gcp.zone_description')}
                    placeholder={t('projects.edit.gcp.zone_placeholder')}
                    control={control}
                    name={FIELD_NAMES.ZONE}
                    options={zoneOptions}
                    onChange={getOnChangeSelectFormField(FIELD_NAMES.ZONE)}
                    disabled={getDisabledByFieldName(FIELD_NAMES.ZONE)}
                    rules={{ required: t('validation.required') }}
                    secondaryControl={renderSpinner()}
                />

                <FormS3BucketSelector
                    info={<InfoLink onFollow={() => openHelpPanel(BUCKET_HELP)} />}
                    prefix="gs://"
                    label={t('projects.edit.gcp.bucket_name')}
                    description={t('projects.edit.gcp.bucket_name_description')}
                    control={control}
                    name={FIELD_NAMES.BUCKET_NAME}
                    selectableItemsTypes={['buckets']}
                    disabled={getDisabledByFieldName(FIELD_NAMES.BUCKET_NAME)}
                    rules={{ required: t('validation.required') }}
                    buckets={bucketNameOptions}
                    secondaryControl={renderSpinner()}
                    i18nStrings={{
                        inContextBrowseButton: 'Choose a bucket',
                        modalBreadcrumbRootItem: 'Storage buckets',
                        modalTitle: 'Choose a storage bucket',
                    }}
                />

                <FormSelect
                    info={<InfoLink onFollow={() => openHelpPanel(SUBNET_HELP)} />}
                    label={t('projects.edit.gcp.subnet')}
                    description={t('projects.edit.gcp.subnet_description')}
                    placeholder={t('projects.edit.gcp.subnet_placeholder')}
                    control={control}
                    name={FIELD_NAMES.VPC_SUBNET}
                    options={subnetOptions}
                    onChange={onChangeVPCSubnet}
                    disabled={getDisabledByFieldName(FIELD_NAMES.VPC_SUBNET)}
                    rules={{ required: t('validation.required') }}
                    secondaryControl={renderSpinner()}
                />

                <FormMultiselect
                    info={<InfoLink onFollow={() => openHelpPanel(ADDITIONAL_REGIONS_HELP)} />}
                    label={t('projects.edit.gcp.extra_regions')}
                    description={t('projects.edit.gcp.extra_regions_description')}
                    placeholder={t('projects.edit.gcp.extra_regions_placeholder')}
                    control={control}
                    name={FIELD_NAMES.EXTRA_REGIONS}
                    onChange={getOnChangeSelectFormField(FIELD_NAMES.EXTRA_REGIONS)}
                    disabled={getDisabledByFieldName(FIELD_NAMES.EXTRA_REGIONS)}
                    secondaryControl={renderSpinner()}
                    options={extraRegions}
                />
            </SpaceBetween>
        </>
    );
};