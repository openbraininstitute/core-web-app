"use client";

import { CheckCircleFilled, MinusOutlined } from "@ant-design/icons";
import { Fragment, useState } from "react";
import { Button } from "antd";
import kebabCase from "lodash/kebabCase";

import { convertPricingData, FormattedPlan, Switch } from "@/components/VirtualLab/create-entity-flows/checkout/shared"
import { useSanityContentForPricing } from "@/components/LandingPage/content/pricing";
import { classNames } from "@/util/utils";

type Props = {
    disableNext: boolean;
    selectedPlan: FormattedPlan | null;
    onNextStep: () => void;
    onSelectPlan: (plan: FormattedPlan) => void;
}


export default function PricingTable({ selectedPlan, disableNext, onNextStep, onSelectPlan }: Props) {
    const data = useSanityContentForPricing();
    const [interval, setInterval] = useState(false);

    if (!data) return null;

    const newData = convertPricingData(data);
    const features = newData.groupedFeatures;
    const planDetails = newData.planDetails;

    return (
        <div className="w-full max-w-5xl mx-auto pb-10">
            <div className="w-full mx-auto">
                <div className="grid grid-cols-4 gap-px bg-transparent py-5">
                    <div className="p-6 flex items-end" />
                    {planDetails.map((plan) => (
                        <div key={`header-${plan.id}`} className={classNames("relative p-3",)}>
                            {plan.title === "Pro" ? (
                                <div className="flex items-center space-x-2 mb-3">
                                    <label htmlFor="interval">Monthly</label>
                                    <Switch
                                        id="interval"
                                        className="bg-primary-8 border-white !border p-1"
                                        thumbCls="bg-white"
                                        onCheckedChange={setInterval}
                                        checked={interval}
                                    />
                                    <label htmlFor="interval">Yearly</label>
                                </div>
                            ) : (
                                <div className="h-5 mb-3" />
                            )}
                            <div className={classNames("flex flex-col h-full-100 text-left")}>
                                <h3 className="text-3xl font-bold mb-4">{plan.title}</h3>
                                <div className="flex flex-col items-baseline gap-3">
                                    <div className="py-4">
                                        {interval ? (
                                            <div className="text-3xl font-bold tracking-tight flex gap-1">
                                                <span className="mr-1">{plan.price?.year.currency}</span>
                                                <span>{plan.price?.year.value}</span>
                                            </div>
                                        ) : (
                                            <div className="text-3xl font-bold tracking-tight flex gap-1">
                                                <span className="mr-1"> {plan.price?.month.currency}</span>
                                                <span>{plan.price?.month.value}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {plan.notes?.map(p => (
                                            <div className="">{p}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="p-6 flex items-end" />
                    <div className="p-6 flex items-end" />
                    {planDetails.filter(p => p.title !== "Free").map((plan) => (
                        <div key={`btn-${plan.id}`} className="p-2 flex w-full">
                            <Button
                                // className={classNames(
                                //     'rounded-none border border-white bg-primary-9 px-14 text-white',
                                //     'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                                //     'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                                //     'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
                                // )}
                                className="rounded-none self-center"
                                type="default"
                                size="middle"
                                htmlType="button"
                                onClick={() => onSelectPlan(plan)}
                                icon={selectedPlan?.id === plan.id ? <CheckCircleFilled className="text-green-600" /> : undefined}
                            >
                                {
                                    plan.title === "Pro" ?
                                        "Select plan" :
                                        "Contact us"
                                }
                            </Button>
                        </div>
                    ))}
                    {Object.entries(features).map(([category, categoryFeatures], catIdx) => (
                        <Fragment key={`btn-${kebabCase(category)}`}>
                            <div id={`category-${catIdx}`} className="col-span-4 p-2">
                                <h4 className="font-bold uppercase text-base text-primary-5">{category}</h4>
                            </div>

                            {categoryFeatures.map((feature, featureIdx) => (
                                <Fragment key={`${catIdx}-${kebabCase(category)}-${featureIdx}-${kebabCase(feature.name)}`}>
                                    <div
                                        id={`name-${catIdx}-${featureIdx}`}
                                        className="p-2 flex items-center"
                                    >
                                        <span className="text-base">{feature.name}</span>
                                    </div>
                                    <div className="p-2 flex justify-center items-center">
                                        {feature.free.value ? <CheckCircleFilled className={classNames(
                                            "h-5 w-5 text-green-600 ",
                                        )} /> : <MinusOutlined className="h-5 w-5 text-primary-5" />}
                                    </div>
                                    <div className="p-2 flex justify-center items-center">
                                        {feature.pro.value ? <CheckCircleFilled className={classNames(
                                            "h-5 w-5 text-green-600 ",
                                        )} /> : <MinusOutlined className="h-5 w-5 text-primary-5" />}
                                    </div>
                                    <div className="p-2 flex justify-center items-center">
                                        {feature.premium.value ? <CheckCircleFilled className={classNames(
                                            "h-5 w-5 text-green-600 ",
                                        )} /> : <MinusOutlined className="h-5 w-5 text-primary-5" />}
                                    </div>
                                </Fragment>
                            ))}

                        </Fragment>
                    ))}


                </div>
            </div>
            <div className="fixed bottom-6 right-6">
                <Button
                    key="create-project-btn"
                    className={classNames(
                        'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                        'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                        'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                        'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
                    )}
                    type="default"
                    size="large"
                    htmlType="button"
                    disabled={disableNext}
                    onClick={onNextStep}
                >
                    To payment
                </Button>
            </div>
        </div>
    );
};